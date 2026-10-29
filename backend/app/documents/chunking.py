"""Text chunking utility for passage retrieval."""
from dataclasses import dataclass
from typing import Optional

from app.documents.extractors import ExtractedSection, ExtractionResult


@dataclass
class DocumentChunk:
    chunk_index: int
    content: str
    page_number: Optional[int]
    heading_path: Optional[str]
    char_offset_start: int
    char_offset_end: int


def chunk_extracted_document(
    extraction: ExtractionResult,
    chunk_size: int = 500,
    chunk_overlap: int = 100,
) -> list[DocumentChunk]:
    """Splits extracted sections into bounded overlapping chunks suitable for semantic search."""
    chunks: list[DocumentChunk] = []
    chunk_idx = 0

    step = max(1, chunk_size - chunk_overlap)

    for section in extraction.sections:
        text = section.content.strip()
        if not text:
            continue

        # If text is small enough, keep as single chunk
        if len(text) <= chunk_size:
            chunks.append(DocumentChunk(
                chunk_index=chunk_idx,
                content=text,
                page_number=section.page_number,
                heading_path=section.heading_path,
                char_offset_start=section.char_offset_start,
                char_offset_end=section.char_offset_end,
            ))
            chunk_idx += 1
            continue

        # Otherwise sliding window
        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            
            # Prefer breaking at sentence or word boundary if not at end
            if end < len(text):
                # Search for period, exclamation, question mark, newline, or space
                boundary = -1
                for punct in [". ", "!\n", "?\n", ".\n", "\n\n", "\n", " "]:
                    pos = text.rfind(punct, start + chunk_size // 2, end)
                    if pos != -1:
                        boundary = pos + len(punct)
                        break
                if boundary > start:
                    end = boundary

            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append(DocumentChunk(
                    chunk_index=chunk_idx,
                    content=chunk_text,
                    page_number=section.page_number,
                    heading_path=section.heading_path,
                    char_offset_start=section.char_offset_start + start,
                    char_offset_end=section.char_offset_start + end,
                ))
                chunk_idx += 1

            if end >= len(text):
                break
            start += step

    return chunks
