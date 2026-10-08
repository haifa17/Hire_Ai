from __future__ import annotations

import io
import logging
import re
import xml.etree.ElementTree as ET
import zipfile

logger = logging.getLogger("smart-cv-ai-service")


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF file using PyPDF2."""
    try:
        import PyPDF2
        pdf_file = io.BytesIO(file_bytes)
        reader = PyPDF2.PdfReader(pdf_file)
        text_pages = []
        for i, page in enumerate(reader.pages):
            extracted = page.extract_text()
            if extracted:
                text_pages.append(extracted)
        return "\n\n".join(text_pages)
    except Exception as e:
        logger.warning("PyPDF2 extraction failed: %s", e)
        return ""


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX file using python-docx or fallback XML parsing."""
    try:
        import docx
        docx_file = io.BytesIO(file_bytes)
        doc = docx.Document(docx_file)
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs)
    except Exception as e:
        logger.warning("python-docx extraction failed, using XML fallback: %s", e)

    # Fallback XML parsing for docx zip structure
    try:
        docx_file = io.BytesIO(file_bytes)
        with zipfile.ZipFile(docx_file) as z:
            xml_content = z.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            texts = []
            for elem in tree.iter():
                if elem.tag.endswith("}t") and elem.text:
                    texts.append(elem.text)
            return " ".join(texts)
    except Exception as e:
        logger.warning("DOCX XML extraction failed: %s", e)
        return ""


def extract_text_from_image(file_bytes: bytes) -> str:
    """Extract text from image file (JPEG, PNG) using easyocr or PIL OCR."""
    try:
        import easyocr
        reader = easyocr.Reader(["en", "fr"], gpu=False)
        results = reader.readtext(file_bytes, detail=0)
        return "\n".join(results)
    except Exception as e:
        logger.warning("EasyOCR extraction failed: %s", e)

    # Fallback basic string extraction for raw bytes if printable
    try:
        ascii_chars = re.findall(rb"[\x20-\x7E\x0A\x0D]{4,}", file_bytes)
        return "\n".join(c.decode("ascii", errors="ignore") for c in ascii_chars)
    except Exception as e:
        logger.warning("Image byte string fallback failed: %s", e)
        return ""


def parse_document(file_bytes: bytes, filename: str = "", content_type: str = "") -> str:
    """
    Parse uploaded resume document (PDF, DOC, DOCX, JPEG, PNG) into plain text.
    """
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    content_type = (content_type or "").lower()

    extracted_text = ""

    if ext == "pdf" or "pdf" in content_type:
        extracted_text = extract_text_from_pdf(file_bytes)
    elif ext in ("docx", "doc") or "word" in content_type or "officedocument" in content_type:
        extracted_text = extract_text_from_docx(file_bytes)
    elif ext in ("jpg", "jpeg", "png") or "image" in content_type:
        extracted_text = extract_text_from_image(file_bytes)

    # If format-specific parsing yielded nothing or format was unknown, try fallbacks
    if not extracted_text.strip():
        # Try PDF
        extracted_text = extract_text_from_pdf(file_bytes)
    if not extracted_text.strip():
        # Try DOCX
        extracted_text = extract_text_from_docx(file_bytes)
    if not extracted_text.strip():
        # Try UTF-8 string decoding
        try:
            extracted_text = file_bytes.decode("utf-8", errors="ignore")
            # Remove non-printable junk
            extracted_text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]", "", extracted_text)
        except Exception:
            extracted_text = ""

    return extracted_text.strip()
