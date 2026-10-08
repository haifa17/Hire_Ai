from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from pathlib import Path
from urllib.parse import urlparse
from dataclasses import dataclass
from typing import Any

from app.providers.base import AIProvider
from app.schemas.matching import CandidateProfileSchema, JobOfferSchema

logger = logging.getLogger("smart-cv-ai-service")


@dataclass(slots=True)
class ExtractedDocument:
    text: str
    sections: list[str]
    confidence: float


class ExtractionAgent:
    _ocr_reader = None  # class-level cache: easyocr.Reader() loads model weights, load once per process

    def __init__(self, provider: AIProvider | None = None) -> None:
        self.provider = provider

    async def run_candidate(self, candidate: CandidateProfileSchema) -> ExtractedDocument:
        # Cascade logic:
        # 1. If candidate.rawText is provided, use it.
        # 2. If candidate.documentId or a local file/url is referenceable, attempt file extraction (Docling/PDF/DOCX).
        # 3. If file extraction produces low-quality text (too short, garbage), fallback to OCR.
        # 4. LLM cleanup and reconciliation pass.

        raw_text = candidate.rawText.strip() if candidate.rawText else ""
        file_path = self._resolve_local_source(candidate.sourceFile or candidate.cvUrl or "")

        if not raw_text:
            # Reconstruct from structured profile if no raw text or file is available
            raw_text = self._build_text(candidate.model_dump())
            confidence = 0.95
        else:
            confidence = 0.85

        raw_text, confidence = await self._apply_file_extraction(file_path, raw_text, confidence)

        # LLM Cleanup / Reconciliation pass — skipped when the profile arrived
        # already structured (the common case: NestJS sends structured
        # experiences/skillsRaw, not a raw CV blob). Cleaning up a JSON dump of
        # an already-structured profile is pure wasted latency: StructuringAgent
        # skips re-parsing it right after anyway (same condition, structuring.py),
        # so the "cleaned" text was never used for anything but section detection.
        already_structured = bool(candidate.experiences and candidate.skillsRaw and not candidate.rawText and not file_path)
        cleaned_text = raw_text if already_structured else await self._llm_cleanup(raw_text)
        sections = self._detect_sections(cleaned_text)

        return ExtractedDocument(text=cleaned_text, sections=sections, confidence=confidence)

    async def _apply_file_extraction(self, file_path: str, raw_text: str, confidence: float) -> tuple[str, float]:
        """If a local file is referenceable, try parsing it (Docling/PyPDF2/OCR
        cascade, run off the event loop) and use its output when non-empty."""
        if not file_path or not os.path.exists(file_path):
            return raw_text, confidence

        extracted_txt, parse_conf = await asyncio.to_thread(self._try_file_extraction, file_path)
        if extracted_txt:
            return extracted_txt, parse_conf
        return raw_text, confidence

    def _resolve_local_source(self, source: str) -> str:
        if not source or not isinstance(source, str):
            return ""

        normalized = self._normalize_source_path(source)
        if not normalized:
            return ""

        allowed_roots = self._allowed_source_roots()
        candidates = self._candidate_paths(normalized, allowed_roots)

        for candidate_path in candidates:
            try:
                resolved = candidate_path.resolve(strict=False)
            except OSError:
                continue
            if self._is_allowed_path(resolved, allowed_roots) and resolved.exists():
                return str(resolved)

        logger.info("Document source could not be resolved under allowed upload roots: %s", normalized)
        return ""

    def _normalize_source_path(self, source: str) -> str:
        """Strips a scheme (only http/https allowed, path kept) and normalizes
        slashes. Returns "" for unsupported schemes or an empty result."""
        parsed = urlparse(source)
        if parsed.scheme in {"http", "https"}:
            source = parsed.path
        elif parsed.scheme and len(parsed.scheme) > 1:
            logger.warning("Ignoring unsupported document source scheme: %s", parsed.scheme)
            return ""

        return source.strip().replace("\\", "/")

    def _candidate_paths(self, source: str, allowed_roots: list[Path]) -> list[Path]:
        """Builds the list of paths to try: the source as-is if absolute (and
        not an /uploads/ URL path), otherwise the source resolved under each
        allowed upload root."""
        source_path = Path(source)
        if source_path.is_absolute() and not source.startswith("/uploads/"):
            return [source_path]

        relative = source.lstrip("/")
        if relative == "uploads":
            relative = ""
        elif relative.startswith("uploads/"):
            relative = relative[len("uploads/"):]
        return [root / relative for root in allowed_roots]

    def _allowed_source_roots(self) -> list[Path]:
        configured = os.getenv("AI_ALLOWED_UPLOAD_ROOTS", "")
        roots: list[Path] = []
        if configured:
            roots.extend(Path(item) for item in configured.split(os.pathsep) if item.strip())

        cwd = Path.cwd()
        roots.extend(
            [
                cwd / "uploads",
                cwd.parent / "uploads",
                cwd.parent / "backend" / "uploads",
            ]
        )

        resolved_roots: list[Path] = []
        for root in roots:
            try:
                resolved = root.resolve(strict=False)
            except OSError:
                continue
            if resolved not in resolved_roots:
                resolved_roots.append(resolved)
        return resolved_roots

    def _is_allowed_path(self, path: Path, allowed_roots: list[Path]) -> bool:
        for root in allowed_roots:
            try:
                path.relative_to(root)
                return True
            except ValueError:
                continue
        return False

    async def run_job_offer(self, job_offer: JobOfferSchema) -> ExtractedDocument:
        raw_text = job_offer.rawText.strip() if job_offer.rawText else ""
        
        if not raw_text:
            raw_text = self._build_text(job_offer.model_dump())
            confidence = 0.95
        else:
            confidence = 0.90

        # See run_candidate: skip the LLM cleanup pass when the offer is
        # already structured — StructuringAgent skips re-parsing it anyway.
        already_structured = bool(job_offer.requiredSkillsRaw and not job_offer.rawText)
        cleaned_text = raw_text if already_structured else await self._llm_cleanup(raw_text)
        sections = self._detect_sections(cleaned_text)

        return ExtractedDocument(text=cleaned_text, sections=sections, confidence=confidence)

    def _try_file_extraction(self, path: str) -> tuple[str, float]:
        # Cascade extraction logic, cheapest first:
        # Step 1: PyPDF2 — fast, no ML model, handles the common case (a PDF
        # with a real text layer) in milliseconds.
        try:
            import PyPDF2
            with open(path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                text = ""
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                if len(text.strip()) > 100:
                    logger.info(f"Successfully extracted text via PyPDF2 from {path}")
                    return text, 0.85
        except Exception as e:
            logger.warning(f"PyPDF2 extraction failed or not installed: {e}")

        # Step 2: Docling fallback — only reached when PyPDF2 found no usable
        # text layer (scanned/image-based PDF, exotic format). Docling runs a
        # full layout-analysis model, so it's much slower than PyPDF2 and is
        # kept off the hot path for ordinary text PDFs.
        try:
            from docling.document_converter import DocumentConverter
            converter = DocumentConverter()
            result = converter.convert(path)
            doc_text = result.document.export_to_markdown()
            if len(doc_text.strip()) > 100:
                logger.info(f"Successfully extracted text via Docling from {path}")
                return doc_text, 0.95
        except Exception as e:
            logger.warning(f"Docling extraction failed or not installed: {e}")

        # Step 3: OCR fallback for scanned/image documents. Only attempted for
        # actual image files — a fabricated placeholder string here would silently
        # corrupt matching scores downstream (fake skills/experience "extracted"
        # from nothing), so any failure/unsupported case returns "" instead,
        # which lets the pipeline's route_extraction abort the run explicitly.
        if Path(path).suffix.lower() in {".png", ".jpg", ".jpeg", ".tiff", ".bmp"}:
            try:
                reader = self._get_ocr_reader()
                lines = reader.readtext(path, detail=0, paragraph=True)
                text = "\n".join(lines).strip()
                if len(text) > 100:
                    logger.info(f"Successfully extracted text via EasyOCR from {path}")
                    return text, 0.65
                logger.warning(f"OCR produced too little text ({len(text)} chars) from {path}")
            except Exception as e:
                logger.warning(f"OCR fallback failed or easyocr not installed: {e}")
        else:
            logger.warning(f"No text could be extracted from {path} and OCR is only supported for image files.")

        return "", 0.0

    def _get_ocr_reader(self):
        if ExtractionAgent._ocr_reader is None:
            import easyocr

            ExtractionAgent._ocr_reader = easyocr.Reader(["en", "fr"], gpu=False)
        return ExtractionAgent._ocr_reader

    async def _llm_cleanup(self, raw_text: str) -> str:
        if not self.provider or len(raw_text) < 50:
            return raw_text

        prompt = f"""
        You are an advanced document parser. Clean up the following raw text extracted from a document.
        - Fix spacing, broken words, and spelling mistakes.
        - Preserve all dates, job titles, school names, skills, and metrics.
        - Reconstruct sections (e.g., Experience, Education, Skills) into a coherent, clean layout.
        - Do not add external commentary or notes. Return only the cleaned text.

        Raw Text:
        \"\"\"{raw_text}\"\"\"
        """
        try:
            cleaned = await asyncio.to_thread(self.provider.generate, prompt)
            return cleaned.strip() if cleaned.strip() else raw_text
        except Exception as e:
            logger.warning(f"LLM cleanup pass failed: {e}")
            return raw_text

    def _detect_sections(self, text: str) -> list[str]:
        sections = []
        lower_text = text.lower()
        if "education" in lower_text or "formation" in lower_text:
            sections.append("education")
        if "experience" in lower_text or "emplois" in lower_text or "work" in lower_text:
            sections.append("experience")
        if "skill" in lower_text or "competences" in lower_text or "compétences" in lower_text:
            sections.append("skills")
        if "project" in lower_text or "projets" in lower_text:
            sections.append("projects")
        if "certif" in lower_text:
            sections.append("certifications")
        return sections if sections else ["general"]

    def _build_text(self, payload: dict) -> str:
        return json.dumps(payload, ensure_ascii=False, indent=2, default=str)
