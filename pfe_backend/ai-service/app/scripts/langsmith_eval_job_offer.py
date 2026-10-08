"""LangSmith dataset + evaluation helpers for the job-offer generation
workflow (`JobOfferGenerationAgent`).

Mirrors `langsmith_eval_resume.py`:
  - `build_job_offer_dataset(...)`: upload/refresh a LangSmith dataset of
    (recruiterPrompt, language) examples.
  - `run_job_offer_evaluation(...)`: replay `JobOfferGenerationAgent.run`
    over a dataset via `langsmith.evaluate`, scoring each generated draft
    with deterministic evaluators, plus optional LLM-as-judge metrics.

Note: unlike `ResumeGenerationAgent.run`, `JobOfferGenerationAgent.run` never
returns a raw/invalid shape — on a parse failure it falls back to
`self.fallback(prompt)`, a heuristic-filled but still schema-valid draft.
That fallback is much lower quality than a real LLM generation, so this
module re-implements the parse step to expose whether the fallback path was
taken (`_meta.usedFallback` in the target's output) instead of relying on
`agent.run` alone, so evaluators can penalize silent fallbacks.

Optional, dev/CI-triggered tooling (not imported by the running FastAPI
app) — requires LANGSMITH_API_KEY:

    python -m app.scripts.langsmith_eval_job_offer build-dataset --name talentbridge-job-offer-eval
    python -m app.scripts.langsmith_eval_job_offer run-eval --dataset talentbridge-job-offer-eval
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

DEFAULT_DATASET_NAME = "talentbridge-job-offer-eval"

REQUIRED_NON_EMPTY_FIELDS = [
    "title",
    "summary",
    "responsibilities",
    "requirements",
    "requiredSkills",
    "benefits",
    "keywords",
]

_SEED_EXAMPLES: list[dict[str, Any]] = [
    {
        "inputs": {
            "prompt": (
                "We need a senior backend engineer, remote, strong Python and "
                "FastAPI, PostgreSQL, Docker/AWS, 5+ years experience, salary "
                "$120k-$150k."
            ),
            "language": "en",
        },
        "outputs": {
            "expectedKeywords": ["Python", "FastAPI", "PostgreSQL", "Docker"],
            "expectSalary": True,
        },
    },
    {
        "inputs": {
            "prompt": "Recherche chef de projet expérimenté maîtrisant Scrum et Jira, Paris, CDI.",
            "language": "fr",
        },
        "outputs": {
            "expectedKeywords": ["Scrum", "Jira"],
            "expectSalary": False,
        },
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


def build_job_offer_dataset(
    name: str = DEFAULT_DATASET_NAME,
    examples_file: str | None = None,
    description: str = "Job-offer generation evaluation examples for TalentBridge AI.",
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


def _extract_all_strings(value: Any) -> list[str]:
    strings: list[str] = []
    if isinstance(value, str):
        strings.append(value)
    elif isinstance(value, dict):
        for v in value.values():
            strings.extend(_extract_all_strings(v))
    elif isinstance(value, list):
        for v in value:
            strings.extend(_extract_all_strings(v))
    return strings


def _generation_succeeded(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: the LLM output actually parsed as JSON — the agent did NOT
    silently fall back to `JobOfferGenerationAgent.fallback(prompt)`, a
    heuristic draft that is schema-valid but much lower quality.

    Parameter names `outputs`/`reference_outputs` are load-bearing for
    langsmith's name-based binding — see the identical note in
    `langsmith_eval._score_within_range`.
    """
    used_fallback = bool((outputs or {}).get("_meta", {}).get("usedFallback"))
    return {"key": "generation_succeeded", "score": 0.0 if used_fallback else 1.0}


def _schema_completeness(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: every field the form-prefill UI actually needs is non-empty
    (not just present — `JobOfferGenerationAgent.normalize` always produces
    every key, so presence alone is meaningless here)."""
    if not outputs:
        return {"key": "schema_completeness", "score": 0.0, "comment": "empty output"}
    missing = [f for f in REQUIRED_NON_EMPTY_FIELDS if not outputs.get(f)]
    score = 1.0 - (len(missing) / len(REQUIRED_NON_EMPTY_FIELDS))
    return {"key": "schema_completeness", "score": score, "comment": f"empty: {missing}" if missing else "complete"}


def _keyword_relevance(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: fraction of `expectedKeywords` (from the recruiter prompt)
    that show up in the generated skills/keywords/requirements."""
    expected = (reference_outputs or {}).get("expectedKeywords")
    if not expected:
        return {"key": "keyword_relevance", "score": None, "comment": "no expected keywords"}
    if not outputs:
        return {"key": "keyword_relevance", "score": 0.0, "comment": "empty output"}

    haystack = " ".join(_extract_all_strings(outputs)).lower()
    matched = [kw for kw in expected if kw.lower() in haystack]
    score = len(matched) / len(expected)
    return {"key": "keyword_relevance", "score": score, "comment": f"matched {matched} of {expected}"}


def _salary_not_invented(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: when the prompt gives no salary info (`expectSalary: False`),
    the agent must leave `salaryMin`/`salaryMax` as null rather than inventing
    a figure — the prompt's hard constraint #5 ("never invent a salary")."""
    expect_salary = (reference_outputs or {}).get("expectSalary")
    if expect_salary is None or expect_salary:
        return {"key": "salary_not_invented", "score": None, "comment": "not applicable"}
    if not outputs:
        return {"key": "salary_not_invented", "score": 0.0, "comment": "empty output"}

    invented = outputs.get("salaryMin") is not None or outputs.get("salaryMax") is not None
    return {"key": "salary_not_invented", "score": 0.0 if invented else 1.0}


def _item_count_within_guidelines(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: list fields respect the prompt's own count guidelines
    (responsibilities 5-8, requirements 5-8, requiredSkills 6-12, benefits
    4-8) — catches degenerate 1-item or excessively long lists."""
    if not outputs:
        return {"key": "item_count_within_guidelines", "score": 0.0, "comment": "empty output"}

    ranges = {
        "responsibilities": (5, 8),
        "requirements": (5, 8),
        "requiredSkills": (6, 12),
        "benefits": (4, 8),
    }
    violations = []
    for field, (lo, hi) in ranges.items():
        count = len(outputs.get(field) or [])
        if not (lo <= count <= hi):
            violations.append(f"{field}={count} (expected {lo}-{hi})")

    score = 1.0 - (len(violations) / len(ranges))
    return {
        "key": "item_count_within_guidelines",
        "score": score,
        "comment": "; ".join(violations) if violations else "within guidelines",
    }


async def _target(inputs: dict[str, Any]) -> dict[str, Any]:
    """Runs the real job-offer generation agent for one dataset example,
    re-implementing the parse step (instead of just calling `agent.run`) so
    the result carries `_meta.usedFallback` for the `_generation_succeeded`
    evaluator."""
    from app.agents.job_offer_agent import JobOfferGenerationAgent
    from app.core.parsing import parse_json_object
    from app.providers.factory import FallbackChainAIProvider
    from app.providers.groq_provider import GroqProvider
    from app.providers.nvidia_nim_provider import NvidiaNimProvider
    from app.providers.ollama_provider import OllamaProvider
    from app.providers.openrouter_provider import OpenRouterProvider

    settings = get_settings()
    provider = FallbackChainAIProvider(
        providers=[
            ("Groq", GroqProvider(settings)),
            ("NVIDIA NIM", NvidiaNimProvider(settings)),
            ("OpenRouter", OpenRouterProvider(settings)),
            ("Ollama", OllamaProvider(settings)),
        ]
    )
    agent = JobOfferGenerationAgent(provider)
    prompt = inputs["prompt"]
    language = inputs.get("language", "en")

    ai_prompt = agent.build_prompt(prompt, language)
    generated_text = await asyncio.to_thread(provider.generate, ai_prompt)

    try:
        result = agent.normalize(parse_json_object(generated_text))
        used_fallback = False
    except ValueError:
        result = agent.fallback(prompt)
        used_fallback = True

    result["_meta"] = {"usedFallback": used_fallback}
    return result


def run_job_offer_evaluation(
    dataset_name: str = DEFAULT_DATASET_NAME,
    experiment_prefix: str = "job-offer-eval",
    use_judge_metrics: bool = False,
) -> Any:
    """Runs the job-offer generation agent over every example in
    `dataset_name` and scores it. Each call creates a new "experiment" in
    LangSmith tied to the dataset — run it again after changing the job-offer
    prompt, model, or provider to compare experiments side by side.

    `use_judge_metrics=True` additionally runs DeepEval LLM-as-judge metrics
    (relevance, professional_quality) via `TalentBridgeJudgeModel`.
    """
    _require_langsmith_client()
    from langsmith import evaluate

    def sync_target(inputs: dict[str, Any]) -> dict[str, Any]:
        return asyncio.run(_target(inputs))

    evaluators = [
        _generation_succeeded,
        _schema_completeness,
        _keyword_relevance,
        _salary_not_invented,
        _item_count_within_guidelines,
    ]

    if use_judge_metrics:
        evaluators.append(_relevance_judge)
        evaluators.append(_professional_quality_judge)

    results = evaluate(
        sync_target,
        data=dataset_name,
        evaluators=evaluators,
        experiment_prefix=experiment_prefix,
    )
    logger.info(f"Evaluation experiment '{experiment_prefix}' finished for dataset '{dataset_name}'.")
    return results


def _relevance_judge(inputs: dict[str, Any], outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """LLM-as-judge evaluator: how well does the generated job offer reflect
    the recruiter's original prompt (role, seniority, must-have skills)?"""
    from app.evaluation.judge_model import get_judge_model

    if not outputs:
        return {"key": "relevance", "score": 0.0, "comment": "empty output"}

    judge = get_judge_model()
    prompt = f"""You are grading how well a generated job offer draft reflects a recruiter's request.

RECRUITER PROMPT:
{inputs.get("prompt")}

GENERATED JOB OFFER:
{json.dumps({k: v for k, v in outputs.items() if k != "_meta"}, ensure_ascii=False)}

Rate relevance from 0 (ignores the prompt) to 100 (accurately reflects role,
seniority, location, and required skills from the prompt). Respond with
strict JSON only:
{{"score": 0-100, "reason": "..."}}
"""
    response = json.loads(judge.generate(prompt))
    score = max(0.0, min(1.0, response.get("score", 0) / 100))
    return {"key": "relevance", "score": score, "comment": response.get("reason", "")}


def _professional_quality_judge(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """LLM-as-judge evaluator: enforces the prompt's own guidelines — a
    polished multi-paragraph summary (not a one-line teaser), concrete
    verb-led responsibilities, no generic filler like "collaborate with
    teams" unless nothing more specific is inferable."""
    from app.evaluation.judge_model import get_judge_model

    if not outputs:
        return {"key": "professional_quality", "score": 0.0, "comment": "empty output"}

    judge = get_judge_model()
    prompt = f"""You are a senior recruiter grading the writing quality of a generated job offer draft.

GENERATED JOB OFFER:
{json.dumps({k: v for k, v in outputs.items() if k != "_meta"}, ensure_ascii=False)}

Grade writing quality against these rules:
- summary reads as a complete, polished job description body (3-5 short
  paragraphs), not a one-line teaser
- responsibilities are concrete actions starting with a verb, specific to
  this role, not generic filler like "collaborate with teams"
- requiredSkills are concrete technologies/skills, not vague soft-skill filler

Rate overall writing quality from 0 (generic/vague throughout) to 100
(consistently specific and polished). Respond with strict JSON only:
{{"score": 0-100, "reason": "..."}}
"""
    response = json.loads(judge.generate(prompt))
    score = max(0.0, min(1.0, response.get("score", 0) / 100))
    return {"key": "professional_quality", "score": score, "comment": response.get("reason", "")}


def _main() -> None:
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description="LangSmith dataset/evaluation tooling for job-offer generation.")
    sub = parser.add_subparsers(dest="command", required=True)

    build_p = sub.add_parser("build-dataset", help="Create/refresh the evaluation dataset in LangSmith.")
    build_p.add_argument("--name", default=DEFAULT_DATASET_NAME)
    build_p.add_argument("--examples-file", default=None, help="Optional JSON file of examples to upload.")

    run_p = sub.add_parser("run-eval", help="Run the job-offer generation agent over a dataset and score it.")
    run_p.add_argument("--dataset", default=DEFAULT_DATASET_NAME)
    run_p.add_argument("--experiment-prefix", default="job-offer-eval")
    run_p.add_argument(
        "--with-judge",
        action="store_true",
        help="Also run DeepEval LLM-as-judge metrics (relevance, professional_quality).",
    )

    args = parser.parse_args()
    if args.command == "build-dataset":
        build_job_offer_dataset(name=args.name, examples_file=args.examples_file)
    elif args.command == "run-eval":
        run_job_offer_evaluation(
            dataset_name=args.dataset,
            experiment_prefix=args.experiment_prefix,
            use_judge_metrics=args.with_judge,
        )


if __name__ == "__main__":
    _main()
