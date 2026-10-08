# DeepEval evaluation tests

LLM-quality evaluation for TalentBridge AI's matching/resume/ATS agents,
using [DeepEval](https://deepeval.com). Separate from the fast unit suite in
`tests/` — these make real calls to the configured AI provider and take
longer to run.

## Running

```bash
# from backend/ai-service, with the project's venv active
pytest tests/evaluation/          # dedicated evaluation run
python -m pytest tests/evaluation/  # equivalent
```

Bare `python -m pytest` (no path) does **not** run this folder — see
`pytest.ini`'s `--ignore=tests/evaluation`. This keeps the everyday fast
suite fast, and keeps evaluation runs (which cost real LLM calls) opt-in.

Tests skip cleanly (not fail) if no AI provider is configured — see
`.env.example` for `GROQ_API_KEY` / `NVIDIA_NIM_API_KEY` / `OPENROUTER_API_KEY`,
or run Ollama locally.

## Layout

- `conftest.py` — `judge_model` / `ai_provider` fixtures shared by every test file.
- `thresholds.py` — documented pass/fail thresholds, one place to tune them.
- `test_resume_generation_eval.py` — `ResumeGenerationAgent` (hallucinated skills/facts).
- `test_structuring_extraction_eval.py` — `StructuringAgent` for CV + job offer (extraction accuracy, misinterpreted requirements).
- `test_explainability_consistency_eval.py` — `ExplainabilityAgent` (explanation vs. score consistency).
- `test_ats_scoring_eval.py` — `ATSScoringAgent` (keyword hallucination, suggestion relevance).

## Adding a new case

1. Pick the agent/feature you're testing and, if one already exists, add to
   its file rather than creating a near-duplicate one.
2. For a literal, checkable fact (a keyword that must/must not appear,
   a required flag), write a **plain `assert`** — cheaper, deterministic, and
   more precise than an LLM judge for that kind of claim.
3. For a fuzzier quality judgment (faithfulness, relevance, "does this text
   agree with these numbers"), use a DeepEval metric with a threshold from
   `thresholds.py` (add a new documented constant there if none fits).
4. Prefer reusing an existing `LLMTestCase`/fixture shape from a sibling file
   over inventing a new pattern.
