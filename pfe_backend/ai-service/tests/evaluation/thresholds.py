"""Documented pass/fail thresholds for DeepEval evaluation tests.

Kept in one place so a threshold change is a one-line diff with a visible
rationale, instead of a magic number buried in a test file. Thresholds are
deliberately not 1.0 — LLM-judged metrics are inherently a little noisy
(judge model variance, borderline-acceptable phrasing), and a threshold of
1.0 would make tests flaky rather than meaningful. They are also
deliberately not so low that a genuinely broken feature (e.g. an agent that
fabricates skills half the time) would still pass.
"""

from __future__ import annotations

# Faithfulness: generated text must not contradict/invent facts beyond the
# supplied source context (resume profile, CV text, job description).
# 0.8 allows a small amount of judge-model noise on paraphrased-but-faithful
# claims while still failing outright fabrication (which scores near 0).
FAITHFULNESS_THRESHOLD = 0.8

# Answer Relevancy: does the LLM's output actually address what was asked
# (e.g. an explanation about *this* candidate/job, not generic filler)?
ANSWER_RELEVANCY_THRESHOLD = 0.7

# Contextual Precision/Recall: for extraction tasks (structuring a CV or job
# offer into structured fields), precision penalizes inventing fields not
# supported by the source text; recall penalizes dropping fields that were
# present. 0.7 tolerates minor wording/ordering differences from the judge
# while still catching agents that under- or over-extract systematically.
CONTEXTUAL_PRECISION_THRESHOLD = 0.7
CONTEXTUAL_RECALL_THRESHOLD = 0.7

# GEval custom metrics (correctness, score/explanation consistency): these
# use an explicit rubric (see each test's `criteria`/`evaluation_steps`), so
# a stricter 0.75 is reasonable — the rubric already does most of the
# disambiguation work that a generic metric like Faithfulness can't.
GEVAL_THRESHOLD = 0.75
