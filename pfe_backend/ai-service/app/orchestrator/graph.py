from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any, Dict

from langgraph.graph import END, StateGraph

from app.agents.matching.cache import MatchingResultCache, content_fingerprint
from app.agents.matching.embedding import EmbeddingAgent
from app.agents.matching.explainability import ExplainabilityAgent
from app.agents.matching.extraction import ExtractionAgent
from app.agents.matching.matching import MatchingAgent
from app.agents.matching.normalization import NormalizationAgent
from app.agents.matching.structuring import StructuringAgent
from app.config.settings import Settings
from app.core.exceptions import AppException
from app.db.models import Candidate, Document, Embedding, JobOffer, MatchingResult
from app.db.session import AsyncSessionLocal
from app.observability.langsmith_tracing import traceable
from app.orchestrator.state import GraphState
from app.providers.base import AIProvider
from app.schemas.matching import (
    MatchingResultSchema,
    MatchingRunRequest,
    MatchingSearchItem,
)

logger = logging.getLogger("smart-cv-ai-service")


class MatchingGraph:
    def __init__(self, settings: Settings, provider: AIProvider | None = None) -> None:
        self.settings = settings
        self.provider = provider
        self.extraction_agent = ExtractionAgent(provider)
        self.structuring_agent = StructuringAgent(provider)
        self.normalization_agent = NormalizationAgent(settings)
        self.embedding_agent = EmbeddingAgent(settings)
        self.matching_agent = MatchingAgent(settings, self.embedding_agent)
        self.explainability_agent = ExplainabilityAgent(provider)
        self.result_cache = MatchingResultCache(settings)
        self.graph = self._build_graph()

    def _trace(self, state: GraphState, message: str) -> None:
        logger.info(f"Transition: {message}")
        state.trace.append(message)

    async def _load_skill_taxonomy_mappings(self) -> Dict[str, str]:
        """Load canonical-name/alias -> canonical-name mappings from SkillTaxonomy."""
        db_mappings: Dict[str, str] = {}
        try:
            from sqlalchemy import select
            from app.db.models import SkillTaxonomy

            async with AsyncSessionLocal() as db:
                stmt = select(SkillTaxonomy)
                res = await db.execute(stmt)
                skills_list = res.scalars().all()
                for sk in skills_list:
                    db_mappings[sk.canonical_name.lower()] = sk.canonical_name
                    for alias in sk.aliases:
                        db_mappings[alias.lower()] = sk.canonical_name
        except Exception as e:
            logger.warning(f"Could not load database skills mappings: {e}")
        return db_mappings

    async def _persist_newly_detected_skills(self, normalized_candidate, normalized_job, db_mappings: Dict[str, str]) -> None:
        """Persist skills discovered in this run that aren't in the taxonomy yet (single batch lookup)."""
        try:
            from sqlalchemy import select
            from app.db.models import SkillTaxonomy

            all_skills = set(
                normalized_candidate.skillsRaw
                + normalized_job.requiredSkillsRaw
                + normalized_job.niceToHaveSkillsRaw
            )
            candidate_new = {sk for sk in all_skills if sk not in db_mappings}
            if not candidate_new:
                return

            async with AsyncSessionLocal() as db:
                stmt = select(SkillTaxonomy.canonical_name).where(SkillTaxonomy.canonical_name.in_(candidate_new))
                res = await db.execute(stmt)
                already_present = {row[0] for row in res.all()}
                for sk_name in candidate_new - already_present:
                    db.add(SkillTaxonomy(canonical_name=sk_name, aliases=[]))
                await db.commit()
        except Exception as e:
            logger.warning(f"Could not persist new skills in database: {e}")

    @traceable(run_type="chain", name="matching_pipeline:extract")
    async def _step_extract(self, state: GraphState) -> Dict[str, Any]:
        self._trace(state, "step_extract:start")
        extracted_candidate = await self.extraction_agent.run_candidate(state.candidate)
        extracted_job = await self.extraction_agent.run_job_offer(state.jobOffer)
        self._trace(state, "step_extract:done")
        return {
            "extractedCandidateText": extracted_candidate.text,
            "extractedJobText": extracted_job.text,
            "trace": state.trace,
        }

    @traceable(run_type="chain", name="matching_pipeline:structure")
    async def _step_structure(self, state: GraphState) -> Dict[str, Any]:
        self._trace(state, "step_structure:start")
        structured_candidate = await self.structuring_agent.run_candidate(
            state.candidate, state.extractedCandidateText
        )
        structured_job = await self.structuring_agent.run_job_offer(
            state.jobOffer, state.extractedJobText
        )
        self._trace(state, "step_structure:done")
        return {
            "normalizedCandidate": structured_candidate,
            "normalizedJobOffer": structured_job,
            "trace": state.trace,
        }

    @traceable(run_type="chain", name="matching_pipeline:normalize")
    async def _step_normalize(self, state: GraphState) -> Dict[str, Any]:
        self._trace(state, "step_normalize:start")
        db_mappings = await self._load_skill_taxonomy_mappings()

        normalized_candidate = self.normalization_agent.normalize_candidate(
            state.normalizedCandidate or state.candidate, db_mappings
        )
        normalized_job = self.normalization_agent.normalize_job_offer(
            state.normalizedJobOffer or state.jobOffer, db_mappings
        )

        # Persist newly detected skills to DB (single batch lookup, not one query per skill)
        await self._persist_newly_detected_skills(normalized_candidate, normalized_job, db_mappings)

        self._trace(state, "step_normalize:done")
        return {
            "normalizedCandidate": normalized_candidate,
            "normalizedJobOffer": normalized_job,
            "trace": state.trace,
        }

    # Matching/Scoring (rule-based ESCO+rapidfuzz + semantic
    # multilingual-e5-small + ranking/SHAP).
    # There used to be a separate "embed" node here computing a whole-profile
    # vector purely for Postgres persistence — but scoring itself only
    # ever used the per-section vectors computed below, so that was a fully
    # redundant extra pair of encode() calls on every single match. The
    # per-section vectors are reused for persistence instead (see
    # `_persist_matching_run`). Runs off the event loop via `asyncio.to_thread`
    # since rapidfuzz/ESCO matching and the embedding encoding are both CPU-bound
    # and would otherwise block every other concurrent request for the duration.
    @traceable(run_type="chain", name="matching_pipeline:score")
    async def _step_score(self, state: GraphState) -> Dict[str, Any]:
        self._trace(state, "step_score:start")
        computation = await asyncio.to_thread(
            self.matching_agent.compute, state.normalizedCandidate, state.normalizedJobOffer
        )
        self._trace(state, "step_score:done")
        semantic = computation.unified.semantic_score
        cv_vectors = semantic.cv_vectors if semantic else {}
        job_vectors = semantic.job_vectors if semantic else {}
        return {
            "breakdown": computation.breakdown,
            "unavailableCriteria": computation.unavailable_criteria,
            "matchedSkills": computation.matched_skills,
            "missingSkills": computation.missing_skills,
            "strengths": computation.strengths,
            "gaps": computation.gaps,
            "finalScore": computation.final_score_0_100,
            "scoreAvailable": computation.final_score_0_100 is not None,
            "scoringMethod": computation.scoring_method,
            "semanticScore": self._to_semantic_schema(semantic),
            "shapExplanation": self.matching_agent.to_explanation_schema(computation.shap_explanation),
            # "skills" section vector doubles as the persisted whole-profile
            # vector (falls back to any other available section) — reusing
            # what scoring already computed instead of a fresh encode() pass.
            "candidateVector": cv_vectors.get("skills") or next(iter(cv_vectors.values()), []),
            "jobVector": job_vectors.get("skills") or next(iter(job_vectors.values()), []),
            "trace": state.trace,
        }

    @traceable(run_type="chain", name="matching_pipeline:explain")
    async def _step_explain(self, state: GraphState) -> Dict[str, Any]:
        self._trace(state, "step_explain:start")
        explanation = await self.explainability_agent.explain(
            candidate=state.normalizedCandidate,
            job_offer=state.normalizedJobOffer,
            breakdown=state.breakdown,
            strengths=state.strengths,
            gaps=state.gaps,
            matched_skills=state.matchedSkills,
            missing_skills=state.missingSkills,
            language=state.language,
            shap_explanation=[item.model_dump() for item in state.shapExplanation],
        )
        self._trace(state, "step_explain:done")
        return {
            "explanation": explanation,
            "trace": state.trace,
        }

    @staticmethod
    def _route_extraction(state: GraphState) -> str:
        if not state.extractedCandidateText.strip() or not state.extractedJobText.strip():
            logger.error("Extraction returned empty text for candidate or job. Aborting.")
            return "abort"
        return "continue"

    def _build_graph(self) -> Any:
        workflow = StateGraph(GraphState)

        # Register nodes
        workflow.add_node("extract", self._step_extract)
        workflow.add_node("structure", self._step_structure)
        workflow.add_node("normalize", self._step_normalize)
        workflow.add_node("score", self._step_score)
        workflow.add_node("explain", self._step_explain)

        # Set entry
        workflow.set_entry_point("extract")

        # Routing edges
        workflow.add_conditional_edges(
            "extract",
            self._route_extraction,
            {
                "continue": "structure",
                "abort": END,
            },
        )

        workflow.add_edge("structure", "normalize")
        workflow.add_edge("normalize", "score")
        workflow.add_edge("score", "explain")
        workflow.add_edge("explain", END)

        return workflow.compile()

    @staticmethod
    def _to_semantic_schema(semantic) -> "SemanticScoreSchema | None":
        if semantic is None:
            return None
        from app.schemas.matching import SemanticScoreSchema

        return SemanticScoreSchema(
            aggregate=semantic.aggregate,
            summary=semantic.per_section.get("summary"),
            skills=semantic.per_section.get("skills"),
            experience=semantic.per_section.get("experience"),
            available=semantic.available,
        )

    @traceable(run_type="chain", name="matching_pipeline:run")
    async def run_matching_pipeline(self, request: MatchingRunRequest) -> MatchingResultSchema:
        cache_key_ids = (request.candidate.id, request.jobOffer.id)
        # Content hash catches edits to the CV/job posting under the same DB id
        # (a candidate updating their CV, a recruiter editing the offer) —
        # without it, a stale cached score would be served indefinitely.
        content_hash = content_fingerprint(
            request.candidate.model_dump_json(), request.jobOffer.model_dump_json()
        )
        esco_version = self.matching_agent.esco.version

        if all(cache_key_ids) and not request.forceRecompute:
            cached = self.result_cache.get(request.candidate.id, request.jobOffer.id, esco_version, content_hash)
            if cached:
                # `globalScore: None` is now a legitimate result (no criterion
                # was available for this pair), not a marker of a corrupt
                # cache entry — the cache key already embeds `MODEL_VERSION`
                # (bumped whenever scoring logic changes materially), which is
                # what actually invalidates stale/incompatible entries. No
                # extra validity check is layered on top of the score itself.
                cached_result = MatchingResultSchema.model_validate(cached)
                logger.info(f"Matching cache hit for candidate={request.candidate.id} job={request.jobOffer.id}")
                return cached_result
        elif request.forceRecompute:
            logger.info(f"Bypassing matching cache (forceRecompute) for candidate={request.candidate.id} job={request.jobOffer.id}")

        initial_state = GraphState(
            candidate=request.candidate,
            jobOffer=request.jobOffer,
            language=request.language,
        )
        self._trace(initial_state, "graph:start")

        # Invoke the compiled LangGraph StateGraph
        final_output = await self.graph.ainvoke(initial_state.model_dump())
        state = GraphState.model_validate(final_output)

        if not state.extractedCandidateText or not state.extractedJobText:
            raise AppException(
                code="EXTRACTION_FAILED",
                message="CV or Job Offer text extraction returned no content",
                status_code=400,
            )

        if state.breakdown is None:
            raise AppException(
                code="MATCHING_PIPELINE_FAILED",
                message="Matching pipeline did not produce a score",
                status_code=502,
            )

        # Overall score comes straight from the unified scoring engine
        # (weighted average today, LGBM once trained) — `finalScore` may
        # legitimately be `None` when no criterion was available for this
        # pair (see `scoreAvailable`), which is not a pipeline failure.
        overall = state.finalScore if state.scoreAvailable else None

        result = MatchingResultSchema(
            candidateId=state.normalizedCandidate.id,
            jobOfferId=state.normalizedJobOffer.id,
            globalScore=overall,
            matchScore=overall,
            score=overall,
            atsScore=overall,
            breakdown=state.breakdown,
            unavailableCriteria=state.unavailableCriteria,
            matchedSkills=state.matchedSkills,
            missingSkills=state.missingSkills,
            strengths=state.strengths,
            gaps=state.gaps,
            explanation=state.explanation,
            candidateSummary=state.normalizedCandidate.summary,
            jobSummary=state.normalizedJobOffer.title,
            trace=state.trace,
            ruleBasedScore=state.ruleBasedScore,
            semanticScore=state.semanticScore,
            scoringMethod=state.scoringMethod,
            shapExplanation=state.shapExplanation,
        )

        # Persist everything in PostgreSQL for audit trails and reuse
        await self._persist_matching_run(state, result)

        if all(cache_key_ids):
            self.result_cache.set(
                request.candidate.id, request.jobOffer.id, result.model_dump(mode="json"), esco_version, content_hash
            )

        return result

    async def _persist_matching_run(self, state: GraphState, result: MatchingResultSchema) -> None:
        try:
            async with AsyncSessionLocal() as db:
                # 1. Document
                doc_candidate = Document(
                    id=uuid.uuid4(),
                    type="resume",
                    source_file=state.normalizedCandidate.sourceFile or state.normalizedCandidate.cvUrl,
                    extraction_status="COMPLETED",
                    confidence_score=0.95,
                )
                doc_job = Document(
                    id=uuid.uuid4(),
                    type="job_offer",
                    extraction_status="COMPLETED",
                    confidence_score=0.95,
                )
                db.add(doc_candidate)
                db.add(doc_job)
                await db.flush()

                # 2. Candidate
                cand_id = self._parse_uuid(state.normalizedCandidate.id) or uuid.uuid4()
                cand_db = await db.get(Candidate, cand_id)
                candidate_payload = {
                    "document_id": doc_candidate.id,
                    "identity": state.normalizedCandidate.identity.model_dump(),
                    "summary": state.normalizedCandidate.summary,
                    "total_experience_years": state.normalizedCandidate.totalExperienceYears,
                    "education": [edu.model_dump() for edu in state.normalizedCandidate.education],
                    "skills_raw": state.normalizedCandidate.skillsRaw,
                    "languages": [lang.model_dump() for lang in state.normalizedCandidate.languages],
                    "certifications": state.normalizedCandidate.certifications,
                    "location": state.normalizedCandidate.location,
                }
                if cand_db:
                    for key, value in candidate_payload.items():
                        setattr(cand_db, key, value)
                else:
                    cand_db = Candidate(id=cand_id, **candidate_payload)
                    db.add(cand_db)

                # 3. Job Offer
                job_id = self._parse_uuid(state.normalizedJobOffer.id) or uuid.uuid4()
                job_db = await db.get(JobOffer, job_id)
                job_payload = {
                    "document_id": doc_job.id,
                    "title": state.normalizedJobOffer.title,
                    "company": state.normalizedJobOffer.company,
                    "missions": state.normalizedJobOffer.missions,
                    "required_skills": state.normalizedJobOffer.requiredSkillsRaw,
                    "nice_to_have_skills": state.normalizedJobOffer.niceToHaveSkillsRaw,
                    "required_experience_years": state.normalizedJobOffer.requiredExperienceYears,
                    "contract_type": state.normalizedJobOffer.contractType,
                    "location": state.normalizedJobOffer.location,
                    "salary_range": state.normalizedJobOffer.salaryRange,
                    "education_level": state.normalizedJobOffer.educationLevel,
                    "languages": state.normalizedJobOffer.languages,
                    "raw_text": state.normalizedJobOffer.rawText,
                }
                if job_db:
                    for key, value in job_payload.items():
                        setattr(job_db, key, value)
                else:
                    job_db = JobOffer(id=job_id, **job_payload)
                    db.add(job_db)
                await db.flush()

                # 4. Embeddings
                if state.candidateVector:
                    emb_cand = Embedding(
                        entity_id=cand_db.id,
                        entity_type="candidate",
                        vector=state.candidateVector,
                        model_version="intfloat/multilingual-e5-small",
                    )
                    db.add(emb_cand)
                if state.jobVector:
                    emb_job = Embedding(
                        entity_id=job_db.id,
                        entity_type="job_offer",
                        vector=state.jobVector,
                        model_version="intfloat/multilingual-e5-small",
                    )
                    db.add(emb_job)

                # 5. Matching Result
                matching_res = MatchingResult(
                    id=uuid.uuid4(),
                    candidate_id=cand_db.id,
                    job_offer_id=job_db.id,
                    global_score=result.globalScore,
                    sub_scores=result.breakdown.model_dump(),
                    explanation=result.explanation,
                )
                db.add(matching_res)
                await db.flush()

                # Note: the `AuditLog` table/model remains in the schema but is
                # no longer written by this pipeline — BiasAuditAgent was
                # removed (plan decision #3).

                await db.commit()
                logger.info("Persisted matching result in PostgreSQL database successfully.")
        except Exception as e:
            logger.exception(f"Failed to persist matching results: {e}")

    def _parse_uuid(self, value: str | None) -> uuid.UUID | None:
        if not value:
            return None
        try:
            return uuid.UUID(value)
        except (TypeError, ValueError):
            return None

    async def rank_candidates(
        self,
        job_offer,
        candidates: list,
        language: str,
        top_k: int,
        max_concurrency: int = 5,
    ) -> list[MatchingSearchItem]:
        semaphore = asyncio.Semaphore(max_concurrency)

        async def score_one(candidate) -> MatchingSearchItem:
            async with semaphore:
                result = await self.run_matching_pipeline(
                    MatchingRunRequest(candidate=candidate, jobOffer=job_offer, language=language),
                )
            return MatchingSearchItem(rank=0, candidate=candidate, matchingResult=result)

        ranked = await asyncio.gather(*(score_one(candidate) for candidate in candidates))
        # `matchScore` can legitimately be `None` (no criterion available) —
        # sort those last rather than letting comparison against `int` raise.
        ranked = sorted(
            ranked,
            key=lambda item: (item.matchingResult.matchScore is not None, item.matchingResult.matchScore or 0),
            reverse=True,
        )
        for index, item in enumerate(ranked[:top_k], start=1):
            item.rank = index
        return ranked[:top_k]
