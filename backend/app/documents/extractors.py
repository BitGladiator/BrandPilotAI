"""Document text extraction utilities for PDF, DOCX, and Markdown files.

Preserves structural metadata:
- PDF: page_number
- DOCX: heading_path
- Markdown: heading_path
Produces explicit errors for empty, encrypted, corrupted, or image-only files.
"""
import io
import re
from dataclasses import dataclass
from typing import Optional

from pypdf import PdfReader
from docx import Document as DocxDocument


class DocumentExtractionError(Exception):
    """Raised when document extraction fails or file is invalid."""
    pass


@dataclass
class ExtractedSection:
    content: str
    page_number: Optional[int] = None
    heading_path: Optional[str] = None
    char_offset_start: int = 0
    char_offset_end: int = 0


@dataclass
class ExtractionResult:
    sections: list[ExtractedSection]
    total_characters: int
    page_count: int
    headings: list[str]


def extract_pdf(file_bytes: bytes) -> ExtractionResult:
    """Extract text and page numbers from PDF files."""
    if not file_bytes:
        raise DocumentExtractionError("The uploaded PDF file is empty.")

    if not file_bytes.startswith(b"%PDF-"):
        raise DocumentExtractionError("Invalid PDF format: file header does not match %PDF-.")

    try:
        reader = PdfReader(io.BytesIO(file_bytes))
    except Exception as exc:
        raise DocumentExtractionError(f"Corrupted or unreadable PDF: {exc}")

    if reader.is_encrypted:
        try:
            reader.decrypt("")
        except Exception:
            raise DocumentExtractionError("Password-protected or encrypted PDFs are not supported.")

    page_count = len(reader.pages)
    if page_count == 0:
        raise DocumentExtractionError("PDF contains zero pages.")

    sections: list[ExtractedSection] = []
    total_chars = 0
    running_offset = 0

    for idx, page in enumerate(reader.pages, start=1):
        try:
            page_text = page.extract_text() or ""
        except Exception as exc:
            raise DocumentExtractionError(f"Error extracting text from page {idx}: {exc}")

        page_text_clean = page_text.strip()
        if page_text_clean:
            start_off = running_offset
            end_off = running_offset + len(page_text_clean)
            sections.append(ExtractedSection(
                content=page_text_clean,
                page_number=idx,
                heading_path=f"Page {idx}",
                char_offset_start=start_off,
                char_offset_end=end_off,
            ))
            running_offset = end_off + 1
            total_chars += len(page_text_clean)

    if total_chars == 0:
        raise DocumentExtractionError(
            "PDF contains no extractable text or is image-only (scanned). OCR is not supported; please provide a text-based document."
        )

    return ExtractionResult(
        sections=sections,
        total_characters=total_chars,
        page_count=page_count,
        headings=[f"Page {i}" for i in range(1, page_count + 1)],
    )


def extract_docx(file_bytes: bytes) -> ExtractionResult:
    """Extract text and heading hierarchy from DOCX files."""
    if not file_bytes:
        raise DocumentExtractionError("The uploaded DOCX file is empty.")

    # Check zip signature (PK\x03\x04)
    if not file_bytes.startswith(b"PK\x03\x04"):
        raise DocumentExtractionError("Invalid DOCX format: not a valid Word document package.")

    try:
        doc = DocxDocument(io.BytesIO(file_bytes))
    except Exception as exc:
        raise DocumentExtractionError(f"Corrupted or unreadable DOCX document: {exc}")

    sections: list[ExtractedSection] = []
    current_headings: list[str] = []
    all_headings: list[str] = []
    total_chars = 0
    running_offset = 0

    for p in doc.paragraphs:
        text = p.text.strip()
        if not text:
            continue

        style_name = p.style.name if p.style else ""
        if style_name.startswith("Heading"):
            match = re.search(r"Heading\s*(\d+)", style_name, re.IGNORECASE)
            level = int(match.group(1)) if match else 1
            # Adjust heading stack to level
            current_headings = current_headings[: level - 1]
            current_headings.append(text)
            all_headings.append(text)
            continue

        heading_path = " > ".join(current_headings) if current_headings else "Document Body"
        start_off = running_offset
        end_off = running_offset + len(text)
        sections.append(ExtractedSection(
            content=text,
            page_number=None,
            heading_path=heading_path,
            char_offset_start=start_off,
            char_offset_end=end_off,
        ))
        running_offset = end_off + 1
        total_chars += len(text)

    # Also parse tables if any
    for table in doc.tables:
        table_rows = []
        for row in table.rows:
            row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
            if row_text:
                table_rows.append(row_text)
        if table_rows:
            table_content = "\n".join(table_rows)
            heading_path = " > ".join(current_headings) if current_headings else "Document Tables"
            sections.append(ExtractedSection(
                content=table_content,
                page_number=None,
                heading_path=heading_path,
                char_offset_start=running_offset,
                char_offset_end=running_offset + len(table_content),
            ))
            running_offset += len(table_content) + 1
            total_chars += len(table_content)

    if total_chars == 0:
        raise DocumentExtractionError("DOCX document contains no text content.")

    return ExtractionResult(
        sections=sections,
        total_characters=total_chars,
        page_count=1,
        headings=all_headings,
    )


def extract_markdown(file_bytes: bytes) -> ExtractionResult:
    """Extract text and heading hierarchy from Markdown (.md) files."""
    if not file_bytes:
        raise DocumentExtractionError("The uploaded Markdown file is empty.")

    try:
        content_str = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            content_str = file_bytes.decode("latin-1")
        except Exception:
            raise DocumentExtractionError("Markdown file must be valid UTF-8 text.")

    lines = content_str.splitlines()
    sections: list[ExtractedSection] = []
    current_headings: list[str] = []
    all_headings: list[str] = []
    current_paragraph: list[str] = []
    running_offset = 0
    total_chars = 0

    def flush_paragraph():
        nonlocal current_paragraph, running_offset, total_chars
        if not current_paragraph:
            return
        text = "\n".join(current_paragraph).strip()
        current_paragraph = []
        if not text:
            return
        heading_path = " > ".join(current_headings) if current_headings else "Overview"
        start_off = running_offset
        end_off = running_offset + len(text)
        sections.append(ExtractedSection(
            content=text,
            page_number=None,
            heading_path=heading_path,
            char_offset_start=start_off,
            char_offset_end=end_off,
        ))
        running_offset = end_off + 1
        total_chars += len(text)

    for line in lines:
        stripped = line.strip()
        if not stripped:
            flush_paragraph()
            continue

        # Check markdown heading (# H1, ## H2, etc.)
        heading_match = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if heading_match:
            flush_paragraph()
            level = len(heading_match.group(1))
            heading_text = heading_match.group(2).strip()
            current_headings = current_headings[: level - 1]
            current_headings.append(heading_text)
            all_headings.append(heading_text)
            continue

        current_paragraph.append(stripped)

    flush_paragraph()

    if total_chars == 0:
        raise DocumentExtractionError("Markdown file contains no readable text content.")

    return ExtractionResult(
        sections=sections,
        total_characters=total_chars,
        page_count=1,
        headings=all_headings,
    )


def extract_document_text(file_bytes: bytes, filename: str) -> ExtractionResult:
    """Dispatches extraction based on file extension and validates content."""
    lower_name = filename.lower()
    if lower_name.endswith(".pdf"):
        return extract_pdf(file_bytes)
    elif lower_name.endswith(".docx"):
        return extract_docx(file_bytes)
    elif lower_name.endswith(".md") or lower_name.endswith(".markdown"):
        return extract_markdown(file_bytes)
    else:
        raise DocumentExtractionError(
            f"Unsupported file format for '{filename}'. BrandPilot supports .pdf, .docx, and .md files."
        )
