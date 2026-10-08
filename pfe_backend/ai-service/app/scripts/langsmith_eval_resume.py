"""LangSmith dataset + evaluation helpers for the CV generation workflow
(`ResumeGenerationAgent`).

Two things live here, mirroring `langsmith_eval.py` for the matching
pipeline:
  - `build_resume_dataset(...)`: upload/refresh a LangSmith dataset of
    (candidateProfile, jobDescription, language) examples, so generation
    quality can be tracked over time.
  - `run_resume_evaluation(...)`: replay `ResumeGenerationAgent.run` over a
    dataset via `langsmith.evaluate`, scoring each generated resume with
    deterministic evaluators (valid JSON, no invented facts, keyword
    coverage, schema completeness). Use this to compare prompt or model
    changes across runs (e.g. change AI_PROVIDER/GROQ_MODEL, or edit the
    resume prompt, then re-run and compare experiments in the LangSmith UI).

Both are optional, dev/CI-triggered tooling (not imported by the running
FastAPI app) — they require LANGSMITH_API_KEY to be configured and are meant
to be run from the command line:

    python -m app.scripts.langsmith_eval_resume build-dataset --name talentbridge-resume-eval
    python -m app.scripts.langsmith_eval_resume run-eval --dataset talentbridge-resume-eval
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import re
from pathlib import Path
from typing import Any

from app.config.settings import get_settings
from app.observability.langsmith_tracing import _LANGSMITH_AVAILABLE

logger = logging.getLogger("smart-cv-ai-service")

DEFAULT_DATASET_NAME = "talentbridge-resume-eval"

REQUIRED_TOP_LEVEL_FIELDS = [
    "personalInfo",
    "socialLinks",
    "professionalSummary",
    "skills",
    "experience",
    "education",
    "projects",
    "languages",
    "certifications",
]

# Minimal built-in seed examples so `build-dataset` works out of the box even
# without a curated JSONL file. Each example pairs a `ResumeGenerationAgent`
# input (profile/jobDescription/language) with expected-output hints used by
# the evaluators below.
_SEED_EXAMPLES: list[dict[str, Any]] = [
    {
        "inputs": {
            "profile": {
                "personalInfo": {
                    "name": "Jane Doe",
                    "email": "jane.doe@example.com",
                    "phone": "+1 555 123 4567",
                    "location": "Remote",
                },
                "experience": [
                    {
                        "title": "Backend Engineer",
                        "company": "Acme Corp",
                        "dates": "2020-2024",
                        "achievements": [
                            "Built REST APIs with FastAPI and PostgreSQL",
                            "Reduced deployment time by 40% using Docker",
                        ],
                    }
                ],
                "education": [
                    {"degree": "BSc Computer Science", "institution": "State University", "dates": "2016-2020"}
                ],
                "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
            },
            "job_description": (
                "We're looking for a senior backend engineer with strong Python, "
                "FastAPI, and PostgreSQL experience, comfortable with Docker and AWS."
            ),
            "language": "en",
        },
        "outputs": {
            "expectedKeywords": ["Python", "FastAPI", "PostgreSQL", "Docker"],
            "allowedCompanies": ["Acme Corp"],
        },
    },
    {
        "inputs": {
            "profile": {
                "personalInfo": {
                    "name": "John Smith",
                    "email": "john.smith@example.com",
                    "phone": "+33 6 12 34 56 78",
                    "location": "Paris",
                },
                "experience": [
                    {
                        "title": "Chef de Projet",
                        "company": "Entreprise SA",
                        "dates": "2019-2023",
                        "achievements": ["Gestion d'une équipe de 5 personnes"],
                    }
                ],
                "education": [{"degree": "Master Gestion de Projet", "institution": "Université Paris", "dates": "2017-2019"}],
                "skills": ["Gestion de projet", "Scrum", "Jira"],
            },
            "job_description": (
                "Nous recherchons un chef de projet expérimenté maîtrisant Scrum et Jira."
            ),
            "language": "fr",
        },
        "outputs": {
            "expectedKeywords": ["Scrum", "Jira"],
            "allowedCompanies": ["Entreprise SA"],
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


def build_resume_dataset(
    name: str = DEFAULT_DATASET_NAME,
    examples_file: str | None = None,
    description: str = "CV generation evaluation examples for TalentBridge AI.",
) -> str:
    """Create (or reuse) a LangSmith dataset and upload examples into it.

    `examples_file`, if given, must be a JSON file containing a list of
    `{"inputs": {"profile": ..., "job_description": ..., "language": ...},
    "outputs": {...}}` objects. Falls back to a small built-in seed set when
    omitted, so the dataset is never empty.
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


def _extract_all_strings(value: Any) -> list[str]:
    """Flattens every string leaf out of a nested dict/list structure."""
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


def _valid_json(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: the agent produced parsable JSON, not a `rawMarkdown` fallback.

    Parameter names `outputs`/`reference_outputs` are load-bearing — see the
    identical note in `langsmith_eval._score_within_range`: `langsmith.evaluate()`
    binds evaluator args by name against a fixed recognized set, so renaming
    these silently breaks argument binding.
    """
    ok = bool(outputs) and "rawMarkdown" not in outputs and "personalInfo" in outputs
    return {"key": "valid_json", "score": 1.0 if ok else 0.0}


def _schema_completeness(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: every required top-level field from the resume prompt's
    output contract is present (even if empty), so downstream consumers
    never crash on a missing key."""
    if not outputs or "rawMarkdown" in outputs:
        return {"key": "schema_completeness", "score": 0.0, "comment": "not valid JSON"}
    missing = [f for f in REQUIRED_TOP_LEVEL_FIELDS if f not in outputs]
    score = 1.0 - (len(missing) / len(REQUIRED_TOP_LEVEL_FIELDS))
    return {"key": "schema_completeness", "score": score, "comment": f"missing: {missing}" if missing else "complete"}


def _ats_keyword_coverage(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: fraction of `expectedKeywords` (extracted from the job
    description) that actually appear somewhere in the generated resume."""
    expected = (reference_outputs or {}).get("expectedKeywords")
    if not expected:
        return {"key": "ats_keyword_coverage", "score": None, "comment": "no expected keywords"}
    if not outputs or "rawMarkdown" in outputs:
        return {"key": "ats_keyword_coverage", "score": 0.0, "comment": "not valid JSON"}

    haystack = " ".join(_extract_all_strings(outputs)).lower()
    matched = [kw for kw in expected if kw.lower() in haystack]
    score = len(matched) / len(expected)
    return {"key": "ats_keyword_coverage", "score": score, "comment": f"matched {matched} of {expected}"}


def _no_invented_companies(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: every company name in `experience` was actually present in
    the source profile (`allowedCompanies`) — guards against the hard
    "NEVER invent companies" constraint in the resume prompt."""
    allowed = (reference_outputs or {}).get("allowedCompanies")
    if allowed is None:
        return {"key": "no_invented_companies", "score": None, "comment": "no allowed-companies reference"}
    if not outputs or "rawMarkdown" in outputs:
        return {"key": "no_invented_companies", "score": 0.0, "comment": "not valid JSON"}

    allowed_normalized = {c.strip().lower() for c in allowed}
    experience = outputs.get("experience") or []
    invented = [
        e.get("company")
        for e in experience
        if e.get("company") and e.get("company").strip().lower() not in allowed_normalized
    ]
    score = 0.0 if invented else 1.0
    return {"key": "no_invented_companies", "score": score, "comment": f"invented: {invented}" if invented else "clean"}


def _no_placeholder_leftovers(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: the model didn't leave literal `"..."` placeholders from the
    prompt's output-format template in the actual output."""
    if not outputs or "rawMarkdown" in outputs:
        return {"key": "no_placeholder_leftovers", "score": 0.0, "comment": "not valid JSON"}
    strings = _extract_all_strings(outputs)
    leftovers = [s for s in strings if re.fullmatch(r"\.\.\.", s.strip())]
    score = 0.0 if leftovers else 1.0
    return {"key": "no_placeholder_leftovers", "score": score, "comment": f"{len(leftovers)} placeholder(s) left"}


def _content_completeness(inputs: dict[str, Any], outputs: dict[str, Any]) -> dict[str, Any]:
    """Evaluator: fraction of the source profile's non-empty sections
    (experience, education, skills, projects) that actually made it into the
    generated resume — catches a generation that returns the full JSON
    schema (passing `schema_completeness`) but drops real profile content
    into empty arrays."""
    if not outputs or "rawMarkdown" in outputs:
        return {"key": "content_completeness", "score": 0.0, "comment": "not valid JSON"}

    profile = inputs.get("profile") or {}
    sections = ["experience", "education", "skills", "projects"]
    present_in_profile = [s for s in sections if profile.get(s)]
    if not present_in_profile:
        return {"key": "content_completeness", "score": None, "comment": "profile has no populated sections"}

    carried_over = [s for s in present_in_profile if outputs.get(s)]
    score = len(carried_over) / len(present_in_profile)
    missing = [s for s in present_in_profile if s not in carried_over]
    return {
        "key": "content_completeness",
        "score": score,
        "comment": f"dropped: {missing}" if missing else "all populated sections carried over",
    }


async def _target(inputs: dict[str, Any]) -> dict[str, Any]:
    """Runs the real resume generation agent for one dataset example."""
    from app.agents.resume_agent import ResumeGenerationAgent
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
    agent = ResumeGenerationAgent(provider)
    result = await asyncio.to_thread(
        agent.run,
        inputs["profile"],
        inputs["job_description"],
        inputs.get("language", "en"),
    )
    return result


def run_resume_evaluation(
    dataset_name: str = DEFAULT_DATASET_NAME,
    experiment_prefix: str = "resume-eval",
    use_judge_metrics: bool = False,
) -> Any:
    """Runs the resume generation agent over every example in `dataset_name`
    and scores it with LangSmith evaluators. Each call creates a new
    "experiment" in LangSmith tied to the dataset — run it again after
    changing the resume prompt, model, or provider to compare experiments
    side by side in the UI.

    `use_judge_metrics=True` additionally runs the DeepEval LLM-as-judge
    metrics (faithfulness, relevance) via `TalentBridgeJudgeModel` — slower
    and costs extra LLM calls, so it's opt-in.
    """
    _require_langsmith_client()  # validates LANGSMITH_API_KEY early
    from langsmith import evaluate

    def sync_target(inputs: dict[str, Any]) -> dict[str, Any]:
        return asyncio.run(_target(inputs))

    evaluators = [
        _valid_json,
        _schema_completeness,
        _ats_keyword_coverage,
        _no_invented_companies,
        _no_placeholder_leftovers,
        _content_completeness,
    ]

    if use_judge_metrics:
        evaluators.append(_faithfulness_judge)
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


def _faithfulness_judge(inputs: dict[str, Any], outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """LLM-as-judge evaluator: does the generated resume only state facts
    derivable from the source profile (no hallucinated achievements/metrics)?
    Uses the same provider chain as the app itself via `TalentBridgeJudgeModel`
    (see `app/evaluation/judge_model.py`) — no separate OpenAI key needed."""
    from app.evaluation.judge_model import get_judge_model

    if not outputs or "rawMarkdown" in outputs:
        return {"key": "faithfulness", "score": 0.0, "comment": "not valid JSON"}

    judge = get_judge_model()
    prompt = f"""You are auditing a generated resume for factual faithfulness.

SOURCE PROFILE (ground truth):
{json.dumps(inputs.get("profile"), ensure_ascii=False)}

GENERATED RESUME:
{json.dumps(outputs, ensure_ascii=False)}

Does the generated resume ONLY contain companies, roles, dates, metrics, and
certifications that are present in or directly derivable from the source
profile, with no invented facts? Respond with strict JSON only:
{{"faithful": true|false, "reason": "..."}}
"""
    response = json.loads(judge.generate(prompt))
    score = 1.0 if response.get("faithful") else 0.0
    return {"key": "faithfulness", "score": score, "comment": response.get("reason", "")}


def _relevance_judge(inputs: dict[str, Any], outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """LLM-as-judge evaluator: how well is the generated resume tailored to
    the target job description (keyword/skills/experience alignment)?
    Scores 0.0-1.0."""
    from app.evaluation.judge_model import get_judge_model

    if not outputs or "rawMarkdown" in outputs:
        return {"key": "relevance", "score": 0.0, "comment": "not valid JSON"}

    judge = get_judge_model()
    prompt = f"""You are grading how well a generated resume is tailored to a job description.

JOB DESCRIPTION:
{inputs.get("job_description")}

GENERATED RESUME:
{json.dumps(outputs, ensure_ascii=False)}

Rate relevance from 0 (not tailored at all) to 100 (excellently tailored:
keywords, skills, and experience ordering match the job). Respond with
strict JSON only:
{{"score": 0-100, "reason": "..."}}
"""
    response = json.loads(judge.generate(prompt))
    score = max(0.0, min(1.0, response.get("score", 0) / 100))
    return {"key": "relevance", "score": score, "comment": response.get("reason", "")}


def _professional_quality_judge(outputs: dict[str, Any], reference_outputs: dict[str, Any]) -> dict[str, Any]:
    """LLM-as-judge evaluator: enforces the "WRITING RULES" section of the
    resume prompt — strong action verbs, specific/quantified bullets, no
    generic filler phrases (e.g. "Worked on backend development")."""
    from app.evaluation.judge_model import get_judge_model

    if not outputs or "rawMarkdown" in outputs:
        return {"key": "professional_quality", "score": 0.0, "comment": "not valid JSON"}

    judge = get_judge_model()
    prompt = f"""You are a senior recruiter grading the writing quality of a generated resume.

GENERATED RESUME:
{json.dumps(outputs, ensure_ascii=False)}

Grade writing quality against these rules:
- Experience bullets start with a strong action verb and show specific,
  quantified impact (e.g. "Developed REST APIs improving response time by 30%")
- No generic/vague filler phrases (e.g. "Worked on backend development",
  "Responsible for various tasks")
- Professional summary is role-focused and specific, not generic boilerplate
- Skills are deduplicated and consistently named

Rate overall writing quality from 0 (generic/vague throughout) to 100
(consistently specific, quantified, professional). Respond with strict JSON
only:
{{"score": 0-100, "reason": "..."}}
"""
    response = json.loads(judge.generate(prompt))
    score = max(0.0, min(1.0, response.get("score", 0) / 100))
    return {"key": "professional_quality", "score": score, "comment": response.get("reason", "")}


def _main() -> None:
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description="LangSmith dataset/evaluation tooling for CV generation.")
    sub = parser.add_subparsers(dest="command", required=True)

    build_p = sub.add_parser("build-dataset", help="Create/refresh the evaluation dataset in LangSmith.")
    build_p.add_argument("--name", default=DEFAULT_DATASET_NAME)
    build_p.add_argument("--examples-file", default=None, help="Optional JSON file of examples to upload.")

    run_p = sub.add_parser("run-eval", help="Run the resume generation agent over a dataset and score it.")
    run_p.add_argument("--dataset", default=DEFAULT_DATASET_NAME)
    run_p.add_argument("--experiment-prefix", default="resume-eval")
    run_p.add_argument(
        "--with-judge",
        action="store_true",
        help="Also run DeepEval LLM-as-judge metrics (faithfulness, relevance). Slower, costs extra LLM calls.",
    )

    args = parser.parse_args()
    if args.command == "build-dataset":
        build_resume_dataset(name=args.name, examples_file=args.examples_file)
    elif args.command == "run-eval":
        run_resume_evaluation(
            dataset_name=args.dataset,
            experiment_prefix=args.experiment_prefix,
            use_judge_metrics=args.with_judge,
        )


if __name__ == "__main__":
    _main()
