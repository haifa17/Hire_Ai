"""LangSmith dataset + evaluation helpers for the recommendation workflow
(`RecommendationPipeline`).

Mirrors `langsmith_eval.py` / `langsmith_eval_resume.py` /
`langsmith_eval_job_offer.py`. Two things live here:
  - `build_recommendation_dataset(...)`: upload/refresh a LangSmith dataset
    of recommendation requests (either direction) with expected outcomes.
  - `run_recommendation_evaluation(...)`: replay
    `RecommendationPipeline.recommend_jobs_for_candidate` /
    `recommend_candidates_for_job` over a dataset via `langsmith.evaluate`.

Each dataset example carries a `direction` field (`"jobs_for_candidate"` or
`"candidates_for_job"`) so both directions of the pipeline can be evaluated
from the same dataset/experiment.

Unlike the matching/resume/job-offer pipelines, this one is NOT a pure
LLM call — it depends on live infra (Qdrant vector search + Postgres
persistence) via `HybridSearchService`/`AsyncSessionLocal`. Running `run-eval`
therefore requires that infra to be reachable, same as running the
`/api/ai/recommendations/*` endpoints normally would; this module adds no
extra mocking on top of what `RecommendationPipeline` already does.

Optional, dev/CI-triggered tooling (not imported by the running FastAPI
app) — requires LANGSMITH_API_KEY:

    python -m app.scripts.langsmith_eval_recommendation build-dataset --name talentbridge-recommendation-eval
    python -m app.scripts.langsmith_eval_recommendation run-eval --dataset talentbridge-recommendation-eval
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
from pathlib import Path
from typing import Any

from app.config.settings import get_settings
from app.observability.langsmith_tracing import _LANGSMITH_AVAILABLE

logger = logging.getLogger("smart-cv-ai-service")

DEFAULT_DATASET_NAME = "talentbridge-recommendation-eval"

_SEED_EXAMPLES: list[dict[str, Any]] = [
    {
        "inputs": {
            "direction": "jobs_for_candidate",
            "candidate_id": "00000000-0000-0000-0000-000000000001",
            "candidate_profile": {
                "user": {"firstName": "Jane", "lastName": "Doe", "address": "Remote"},
                "profile": {
                    "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
                    "experiences": [
                        {
                            "title": "Senior Backend Engineer",
                            "startDate": "2018-01-01",
                            "endDate": "2024-01-01",
                        }
                    ],
                    "education": [],
                    "desiredPosition": "Senior Backend Engineer",
                    "openToWork": True,
                },
            },
            "top_k": 5,
            "language": "en",
        },
        "outputs": {"expectedTopEntityIds": []},
    },
]


def _require_langsmith_client():
    if not _LANGSMITH_AVAILABLE:
        raise RuntimeError(
            "The 'langsmith' package is not installed. Install project requirements "
            "(pip install -r requirements.txt) before running dataset/eval tooling."
        )
    from langsmith import Client

    settings = get_settings()
    if not settings.langsmith_api_key:
        raise RuntimeError(
            "LANGSMITH_API_KEY is not set. Dataset/evaluation tooling requires a "
            "LangSmith API key (see .env.example)."
        )
    return Client(api_key=settings.langsmith_api_key)


def build_recommendation_dataset(
    name: str = DEFAULT_DATASET_NAME,
    examples_file: str | None = None,
    description: str = "Recommendation pipeline evaluation examples for TalentBridge AI.",
) -> str:
    client = _require_langsmith_client()

    if examples_file:
        examples = json.loads(Path(examples_file).read_text(encoding="utf-8"))
    else:
        examples = _SEED_EXAMPLES

    if not client.has_dataset(dataset_name=name):
        dataset = client.create_dataset(dataset_name=name, description=description)
        logger.info(f"Created LangSmith dataset '{name}' ({dataset.id}).")
    else:
        dataset = client.read_dataset(dataset_name=name)
        logger.info(f"Reusing existing LangSmith dataset '{name}' ({dataset.id}).")

    client.create_examples(
        inputs=[ex["inputs"] for ex in examples],
        outputs=[ex.get("outputs", {}) for ex in examples],
        dataset_id=dataset.id,
    )
    logger.info(f"Uploaded {len(examples)} example(s) to dataset '{name}'.")
    return str(dataset.id)


def _recall_at_k(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: fraction of `expectedTopEntityIds` (known-good matches for
    this candidate/job, curated offline) that actually appear anywhere in the
    returned Top-K recommendations.

    Parameter names `outputs`/`reference_outputs` are load-bearing for
    langsmith's name-based binding — see the identical note in
    `langsmith_eval._score_within_range`.
    """
    expected = (reference_outputs or {}).get("expectedTopEntityIds")
    if not expected:
        return {"key": "recall_at_k", "score": None, "comment": "no expected entities"}

    returned_ids = {r.get("entity_id") for r in (outputs or {}).get("recommendations", [])}
    matched = [eid for eid in expected if eid in returned_ids]
    score = len(matched) / len(expected)
    return {"key": "recall_at_k", "score": score, "comment": f"matched {matched} of {expected}"}


def _no_duplicate_recommendations(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: no entity is recommended twice in the same response."""
    recs = (outputs or {}).get("recommendations", [])
    ids = [r.get("entity_id") for r in recs]
    score = 1.0 if len(ids) == len(set(ids)) else 0.0
    return {"key": "no_duplicate_recommendations", "score": score}


def _scores_valid_and_ranked(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: every `overall_score` is within [0, 100] (when present) and
    the list is sorted descending — a ranking sanity check that catches
    scoring/sorting regressions independent of match quality."""
    recs = (outputs or {}).get("recommendations", [])
    if not recs:
        return {"key": "scores_valid_and_ranked", "score": None, "comment": "no recommendations returned"}

    scores = [r.get("overall_score") for r in recs]
    out_of_range = [s for s in scores if s is not None and not (0.0 <= s <= 100.0)]
    non_none_scores = [s for s in scores if s is not None]
    is_sorted = non_none_scores == sorted(non_none_scores, reverse=True)

    ok = not out_of_range and is_sorted
    comment = []
    if out_of_range:
        comment.append(f"out-of-range scores: {out_of_range}")
    if not is_sorted:
        comment.append("not sorted descending")
    return {"key": "scores_valid_and_ranked", "score": 1.0 if ok else 0.0, "comment": "; ".join(comment) or "ok"}


def _explanations_present(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: every returned recommendation has a non-empty explanation
    string (the LLM explanation step didn't silently fail/return "")."""
    recs = (outputs or {}).get("recommendations", [])
    if not recs:
        return {"key": "explanations_present", "score": None, "comment": "no recommendations returned"}

    with_explanation = [r for r in recs if (r.get("explanation") or "").strip()]
    score = len(with_explanation) / len(recs)
    return {"key": "explanations_present", "score": score}


async def _target(inputs: dict[str, Any]) -> dict[str, Any]:
    """Runs the real recommendation pipeline for one dataset example, in
    whichever direction the example specifies."""
    from app.agents.recommendation.recommendation_pipeline import RecommendationPipeline

    settings = get_settings()
    pipeline = RecommendationPipeline(settings)

    direction = inputs.get("direction", "jobs_for_candidate")
    if direction == "jobs_for_candidate":
        response = await pipeline.recommend_jobs_for_candidate(
            candidate_id=inputs["candidate_id"],
            candidate_profile=inputs["candidate_profile"],
            top_k=inputs.get("top_k", 5),
            language=inputs.get("language", "en"),
            trigger="langsmith_eval",
        )
    elif direction == "candidates_for_job":
        response = await pipeline.recommend_candidates_for_job(
            job_id=inputs["job_id"],
            job_offer=inputs["job_offer"],
            top_k=inputs.get("top_k", 10),
            language=inputs.get("language", "en"),
            trigger="langsmith_eval",
        )
    else:
        raise ValueError(f"Unknown direction '{direction}' — expected 'jobs_for_candidate' or 'candidates_for_job'")

    return response.model_dump(mode="json")


def run_recommendation_evaluation(
    dataset_name: str = DEFAULT_DATASET_NAME,
    experiment_prefix: str = "recommendation-eval",
    use_judge_metrics: bool = False,
) -> Any:
    """Runs the recommendation pipeline over every example in `dataset_name`
    and scores it. Each call creates a new "experiment" in LangSmith tied to
    the dataset — run it again after changing a scoring weight
    (`MATCHING_*` settings), the explanation prompt, or the retrieval top-k
    to compare experiments side by side.

    `use_judge_metrics=True` additionally runs a DeepEval LLM-as-judge metric
    (`explanation_faithfulness`) via `TalentBridgeJudgeModel`.

    Requires live Qdrant + Postgres connectivity, same as the recommendation
    API endpoints themselves — this is not a pure-LLM pipeline.
    """
    _require_langsmith_client()
    from langsmith import evaluate

    def sync_target(inputs: dict[str, Any]) -> dict[str, Any]:
        return asyncio.run(_target(inputs))

    evaluators = [
        _recall_at_k,
        _no_duplicate_recommendations,
        _scores_valid_and_ranked,
        _explanations_present,
    ]

    if use_judge_metrics:
        evaluators.append(_explanation_faithfulness_judge)

    results = evaluate(
        sync_target,
        data=dataset_name,
        evaluators=evaluators,
        experiment_prefix=experiment_prefix,
    )
    logger.info(f"Evaluation experiment '{experiment_prefix}' finished for dataset '{dataset_name}'.")
    return results


def _explanation_faithfulness_judge(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """LLM-as-judge evaluator: does each recommendation's explanation only
    reference facts actually present in its own `breakdown`/`metadata`
    (no invented skills or scores not backed by the returned data)?
    Scores the average faithfulness across all recommendations in the
    response."""
    from app.evaluation.judge_model import get_judge_model

    recs = (outputs or {}).get("recommendations", [])
    if not recs:
        return {"key": "explanation_faithfulness", "score": None, "comment": "no recommendations returned"}

    judge = get_judge_model()
    scores: list[float] = []
    reasons: list[str] = []
    for rec in recs:
        prompt = f"""You are auditing whether a recommendation's explanation is grounded in its own data.

SCORE BREAKDOWN AND METADATA (ground truth for this recommendation):
{json.dumps({"breakdown": rec.get("breakdown"), "metadata": rec.get("metadata"), "overall_score": rec.get("overall_score")}, ensure_ascii=False)}

EXPLANATION TEXT:
{rec.get("explanation", "")}

Does the explanation ONLY reference skills, scores, or facts that are
actually present in the breakdown/metadata above, with no invented claims?
Respond with strict JSON only:
{{"faithful": true|false, "reason": "..."}}
"""
        response = json.loads(judge.generate(prompt))
        scores.append(1.0 if response.get("faithful") else 0.0)
        reasons.append(response.get("reason", ""))

    avg_score = sum(scores) / len(scores)
    return {"key": "explanation_faithfulness", "score": avg_score, "comment": "; ".join(reasons)}


def _main() -> None:
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description="LangSmith dataset/evaluation tooling for the recommendation pipeline.")
    sub = parser.add_subparsers(dest="command", required=True)

    build_p = sub.add_parser("build-dataset", help="Create/refresh the evaluation dataset in LangSmith.")
    build_p.add_argument("--name", default=DEFAULT_DATASET_NAME)
    build_p.add_argument("--examples-file", default=None, help="Optional JSON file of examples to upload.")

    run_p = sub.add_parser("run-eval", help="Run the recommendation pipeline over a dataset and score it.")
    run_p.add_argument("--dataset", default=DEFAULT_DATASET_NAME)
    run_p.add_argument("--experiment-prefix", default="recommendation-eval")
    run_p.add_argument(
        "--with-judge",
        action="store_true",
        help="Also run the DeepEval LLM-as-judge metric (explanation_faithfulness).",
    )

    args = parser.parse_args()
    if args.command == "build-dataset":
        build_recommendation_dataset(name=args.name, examples_file=args.examples_file)
    elif args.command == "run-eval":
        run_recommendation_evaluation(
            dataset_name=args.dataset,
            experiment_prefix=args.experiment_prefix,
            use_judge_metrics=args.with_judge,
        )


if __name__ == "__main__":
    _main()
