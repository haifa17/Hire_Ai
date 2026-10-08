"""LangSmith dataset + evaluation helpers for the CV <-> job-offer matching pipeline.

Two things live here:
  - `build_matching_dataset(...)`: upload/refresh a LangSmith dataset of
    (candidate, jobOffer) pairs with expected scores, so matching quality can
    be tracked over time.
  - `run_matching_evaluation(...)`: replay `MatchingGraph.run_matching_pipeline`
    over a dataset via `langsmith.evaluate`, scoring each run against the
    expected output. Use this to compare prompt or model changes across runs
    (e.g. change AI_PROVIDER/GROQ_MODEL, or edit an agent's prompt, then
    re-run and compare the two experiments in the LangSmith UI).

Both are optional, dev/CI-triggered tooling (not imported by the running
FastAPI app) — they require LANGSMITH_API_KEY to be configured and are meant
to be run from the command line:

    python -m app.scripts.langsmith_eval build-dataset --name talentbridge-matching-eval
    python -m app.scripts.langsmith_eval run-eval --dataset talentbridge-matching-eval
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

DEFAULT_DATASET_NAME = "talentbridge-matching-eval"

# Minimal built-in seed examples so `build-dataset` works out of the box even
# without a curated JSONL file. Each example pairs a candidate/job payload
# (matching `MatchingRunRequest`'s shape) with the expected outcome.
_SEED_EXAMPLES: list[dict[str, Any]] = [
    {
        "inputs": {
            "candidate": {
                "id": "seed-candidate-1",
                "rawText": (
                    "Senior backend engineer, 6 years experience with Python, FastAPI, "
                    "PostgreSQL, Docker, and AWS. Led a team migrating a monolith to "
                    "microservices."
                ),
            },
            "jobOffer": {
                "id": "seed-job-1",
                "title": "Senior Backend Engineer",
                "rawText": (
                    "We're looking for a senior backend engineer with strong Python, "
                    "FastAPI, and PostgreSQL experience, comfortable with Docker/AWS "
                    "and leading small teams."
                ),
            },
            "language": "en",
        },
        "outputs": {"expectedScoreRange": [70, 100]},
    },
    {
        "inputs": {
            "candidate": {
                "id": "seed-candidate-2",
                "rawText": "Junior graphic designer, 1 year experience with Photoshop and Illustrator.",
            },
            "jobOffer": {
                "id": "seed-job-2",
                "title": "Senior Backend Engineer",
                "rawText": (
                    "We're looking for a senior backend engineer with strong Python, "
                    "FastAPI, and PostgreSQL experience."
                ),
            },
            "language": "en",
        },
        "outputs": {"expectedScoreRange": [0, 30]},
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


def build_matching_dataset(
    name: str = DEFAULT_DATASET_NAME,
    examples_file: str | None = None,
    description: str = "CV <-> job-offer matching evaluation examples for TalentBridge AI.",
) -> str:
    """Create (or reuse) a LangSmith dataset and upload examples into it.

    `examples_file`, if given, must be a JSON file containing a list of
    `{"inputs": {...}, "outputs": {...}}` objects shaped like
    `MatchingRunRequest` inputs plus expected outcomes. Falls back to a small
    built-in seed set when omitted, so the dataset is never empty.
    """
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


def _score_within_range(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: checks the pipeline's globalScore falls in the expected range.

    Parameter names `outputs`/`reference_outputs` are load-bearing: langsmith's
    `evaluate()` inspects an evaluator's signature and binds by name against a
    fixed set of recognized parameters (`run`, `example`, `inputs`, `outputs`,
    `reference_outputs`) — anything else silently falls back to positional
    binding and ends up receiving the raw `Example` object instead of its
    `.outputs` dict (breaking `.get(...)` calls below).
    """
    expected_range = (reference_outputs or {}).get("expectedScoreRange")
    actual_score = (outputs or {}).get("globalScore")
    if expected_range is None or actual_score is None:
        return {"key": "score_in_range", "score": None, "comment": "missing expected range or actual score"}
    lo, hi = expected_range
    ok = lo <= actual_score <= hi
    return {
        "key": "score_in_range",
        "score": 1.0 if ok else 0.0,
        "comment": f"expected [{lo}, {hi}], got {actual_score}",
    }


def _matched_missing_skills_disjoint(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: `matchedSkills` and `missingSkills` never overlap — a basic
    internal-consistency invariant of `MatchingResultSchema` (a skill can't be
    simultaneously present and missing)."""
    matched = set((outputs or {}).get("matchedSkills") or [])
    missing = set((outputs or {}).get("missingSkills") or [])
    overlap = matched & missing
    return {
        "key": "matched_missing_skills_disjoint",
        "score": 0.0 if overlap else 1.0,
        "comment": f"overlap: {sorted(overlap)}" if overlap else "disjoint",
    }


def _explanation_present(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: the explainability step actually produced a non-empty
    explanation for the match."""
    explanation = ((outputs or {}).get("explanation") or "").strip()
    return {"key": "explanation_present", "score": 1.0 if explanation else 0.0}


def _breakdown_completeness(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: fraction of the 7 unified-scoring criteria (skills,
    experience, semantic, education, projects, languages, certifications)
    that produced a non-null sub-score, instead of being silently skipped."""
    breakdown = (outputs or {}).get("breakdown") or {}
    criteria = ["skills", "experience", "semantic", "education", "projects", "languages", "certifications"]
    scored = [c for c in criteria if breakdown.get(c) is not None]
    score = len(scored) / len(criteria)
    unavailable = (outputs or {}).get("unavailableCriteria") or []
    return {
        "key": "breakdown_completeness",
        "score": score,
        "comment": f"unavailable: {unavailable}" if unavailable else "all criteria scored",
    }


async def _target(inputs: dict[str, Any]) -> dict[str, Any]:
    """Runs the real matching pipeline for one dataset example."""
    from app.orchestrator.graph import MatchingGraph
    from app.providers.factory import FallbackChainAIProvider, get_provider  # noqa: F401
    from app.providers.groq_provider import GroqProvider
    from app.providers.nvidia_nim_provider import NvidiaNimProvider
    from app.providers.ollama_provider import OllamaProvider
    from app.providers.openrouter_provider import OpenRouterProvider
    from app.schemas.matching import MatchingRunRequest

    settings = get_settings()
    provider = FallbackChainAIProvider(
        providers=[
            ("Groq", GroqProvider(settings)),
            ("NVIDIA NIM", NvidiaNimProvider(settings)),
            ("OpenRouter", OpenRouterProvider(settings)),
            ("Ollama", OllamaProvider(settings)),
        ]
    )
    graph = MatchingGraph(settings, provider)
    request = MatchingRunRequest.model_validate(inputs)
    result = await graph.run_matching_pipeline(request)
    return result.model_dump(mode="json")


def run_matching_evaluation(
    dataset_name: str = DEFAULT_DATASET_NAME,
    experiment_prefix: str = "matching-eval",
    use_judge_metrics: bool = False,
) -> Any:
    """Runs the matching pipeline over every example in `dataset_name` and
    scores it with LangSmith evaluators. Each call creates a new "experiment"
    in LangSmith tied to the dataset — run it again after changing a prompt,
    model, or scoring weight to compare experiments side by side in the UI.

    `use_judge_metrics=True` additionally runs DeepEval LLM-as-judge metrics
    (faithfulness, relevance) via `TalentBridgeJudgeModel` — slower and costs
    extra LLM calls, so it's opt-in.
    """
    _require_langsmith_client()  # validates LANGSMITH_API_KEY early
    from langsmith import evaluate

    def sync_target(inputs: dict[str, Any]) -> dict[str, Any]:
        return asyncio.run(_target(inputs))

    evaluators = [
        _score_within_range,
        _matched_missing_skills_disjoint,
        _explanation_present,
        _breakdown_completeness,
    ]

    if use_judge_metrics:
        evaluators.append(_faithfulness_judge)
        evaluators.append(_relevance_judge)

    results = evaluate(
        sync_target,
        data=dataset_name,
        evaluators=evaluators,
        experiment_prefix=experiment_prefix,
    )
    logger.info(f"Evaluation experiment '{experiment_prefix}' finished for dataset '{dataset_name}'.")
    return results


def _faithfulness_judge(inputs: dict[str, Any], outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """LLM-as-judge evaluator: does the match explanation only cite facts
    (skills, experience, gaps) actually present in the candidate/job raw
    text and the computed breakdown — no invented claims about the
    candidate or the role?"""
    from app.evaluation.judge_model import get_judge_model

    explanation = (outputs or {}).get("explanation", "")
    if not explanation.strip():
        return {"key": "faithfulness", "score": 0.0, "comment": "empty explanation"}

    judge = get_judge_model()
    prompt = f"""You are auditing a CV-to-job match explanation for factual faithfulness.

CANDIDATE (source of truth):
{json.dumps(inputs.get("candidate"), ensure_ascii=False)}

JOB OFFER (source of truth):
{json.dumps(inputs.get("jobOffer"), ensure_ascii=False)}

MATCH EXPLANATION TO AUDIT:
{explanation}

Does the explanation ONLY reference skills, experience, or gaps that are
actually derivable from the candidate/job text above, with no invented
facts? Respond with strict JSON only:
{{"faithful": true|false, "reason": "..."}}
"""
    response = json.loads(judge.generate(prompt))
    score = 1.0 if response.get("faithful") else 0.0
    return {"key": "faithfulness", "score": score, "comment": response.get("reason", "")}


def _relevance_judge(inputs: dict[str, Any], outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """LLM-as-judge evaluator: does the explanation actually address whether
    THIS candidate fits THIS job (specific reasoning), rather than generic
    boilerplate that could apply to any match?"""
    from app.evaluation.judge_model import get_judge_model

    explanation = (outputs or {}).get("explanation", "")
    if not explanation.strip():
        return {"key": "relevance", "score": 0.0, "comment": "empty explanation"}

    judge = get_judge_model()
    prompt = f"""You are grading whether a CV-to-job match explanation is specific and relevant.

JOB OFFER:
{json.dumps(inputs.get("jobOffer"), ensure_ascii=False)}

MATCH EXPLANATION TO GRADE:
{explanation}

Rate relevance from 0 (generic boilerplate that could apply to any
candidate/job pair) to 100 (specifically reasons about this candidate's fit
for this exact role, citing concrete skills/experience/gaps). Respond with
strict JSON only:
{{"score": 0-100, "reason": "..."}}
"""
    response = json.loads(judge.generate(prompt))
    score = max(0.0, min(1.0, response.get("score", 0) / 100))
    return {"key": "relevance", "score": score, "comment": response.get("reason", "")}


def _main() -> None:
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description="LangSmith dataset/evaluation tooling for CV matching.")
    sub = parser.add_subparsers(dest="command", required=True)

    build_p = sub.add_parser("build-dataset", help="Create/refresh the evaluation dataset in LangSmith.")
    build_p.add_argument("--name", default=DEFAULT_DATASET_NAME)
    build_p.add_argument("--examples-file", default=None, help="Optional JSON file of examples to upload.")

    run_p = sub.add_parser("run-eval", help="Run the matching pipeline over a dataset and score it.")
    run_p.add_argument("--dataset", default=DEFAULT_DATASET_NAME)
    run_p.add_argument("--experiment-prefix", default="matching-eval")
    run_p.add_argument(
        "--with-judge",
        action="store_true",
        help="Also run DeepEval LLM-as-judge metrics (faithfulness, relevance). Slower, costs extra LLM calls.",
    )

    args = parser.parse_args()
    if args.command == "build-dataset":
        build_matching_dataset(name=args.name, examples_file=args.examples_file)
    elif args.command == "run-eval":
        run_matching_evaluation(
            dataset_name=args.dataset,
            experiment_prefix=args.experiment_prefix,
            use_judge_metrics=args.with_judge,
        )


if __name__ == "__main__":
    _main()
