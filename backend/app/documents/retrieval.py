"""Document indexing and pgvector semantic retrieval service."""
import logging
import math
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import Settings, get_settings
from app.db.models import Document, GuidelinePassage
from app.documents.chunking import chunk_extracted_document
from app.documents.embeddings import EmbeddingServiceUnavailableError, get_embedding_provider
from app.documents.extractors import extract_document_text
from app.documents.storage import read_stored_file

logger = logging.getLogger("brandpilot.retrieval")


@dataclass
class RetrievedPassage:
    passage_id: str
    document_id: str
    document_name: str
    content: str
    heading_path: Optional[str]
    page_number: Optional[int]
    char_offset_start: Optional[int]
    char_offset_end: Optional[int]
    similarity_score: float


async def process_and_index_document(document_id: str, db: Session, settings: Optional[Settings] = None) -> bool:
    """Extracts text, creates chunks, computes embeddings, and indexes passages into PostgreSQL."""
    if settings is None:
        settings = get_settings()

    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        logger.error("Document %s not found for processing.", document_id)
        return False

    doc.status = "processing"
    doc.error_message = None
    db.commit()

    try:
        # Read file
        file_bytes = read_stored_file(doc.filename)

        # Extract text & structure
        extraction = extract_document_text(file_bytes, doc.original_name)

        # Chunk text
        chunks = chunk_extracted_document(
            extraction,
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )

        if not chunks:
            raise ValueError("No extractable chunks found in document.")

        # Compute embeddings
        provider = get_embedding_provider(settings)
        chunk_texts = [c.content for c in chunks]
        embeddings = await provider.embed_texts(chunk_texts)

        # Remove any existing passages for idempotency
        db.query(GuidelinePassage).filter(GuidelinePassage.document_id == document_id).delete()

        # Insert passages
        for chunk, emb in zip(chunks, embeddings):
            passage = GuidelinePassage(
                document_id=doc.id,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                page_number=chunk.page_number,
                heading_path=chunk.heading_path,
                char_offset_start=chunk.char_offset_start,
                char_offset_end=chunk.char_offset_end,
                embedding=emb,
            )
            db.add(passage)

        doc.status = "indexed"
        doc.extracted_metadata = {
            "page_count": extraction.page_count,
            "chunk_count": len(chunks),
            "total_characters": extraction.total_characters,
            "headings": extraction.headings[:20],
        }
        db.commit()
        db.refresh(doc)
        logger.info("Successfully indexed document %s (%s) with %d chunks.", doc.id, doc.original_name, len(chunks))
        return True

    except Exception as exc:
        db.rollback()
        logger.error("Failed to process document %s: %s", document_id, exc)
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = "error"
            doc.error_message = str(exc)
            db.commit()
        return False


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


async def search_relevant_passages(
    query: str,
    db: Session,
    limit: int = 5,
    min_similarity: float = 0.25,
    settings: Optional[Settings] = None,
) -> list[RetrievedPassage]:
    """Retrieves guideline passages relevant to query vector from PostgreSQL using pgvector."""
    if settings is None:
        settings = get_settings()

    if not query.strip():
        return []

    provider = get_embedding_provider(settings)
    query_vec = await provider.embed_query(query)

    bind = db.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    results: list[RetrievedPassage] = []

    if is_postgres:
        try:
            # Native pgvector cosine distance: GuidelinePassage.embedding.cosine_distance(query_vec)
            # cosine_distance is 1.0 - cosine_similarity
            query_obj = (
                db.query(
                    GuidelinePassage,
                    Document.original_name,
                    GuidelinePassage.embedding.cosine_distance(query_vec).label("distance"),
                )
                .join(Document, GuidelinePassage.document_id == Document.id)
                .filter(Document.status == "indexed")
                .order_by("distance")
                .limit(limit)
            )

            for passage, doc_name, dist in query_obj.all():
                dist_val = float(dist) if dist is not None else 1.0
                sim = max(0.0, min(1.0, 1.0 - dist_val))
                if sim >= min_similarity:
                    results.append(RetrievedPassage(
                        passage_id=passage.id,
                        document_id=passage.document_id,
                        document_name=doc_name,
                        content=passage.content,
                        heading_path=passage.heading_path,
                        page_number=passage.page_number,
                        char_offset_start=passage.char_offset_start,
                        char_offset_end=passage.char_offset_end,
                        similarity_score=round(sim, 4),
                    ))
            return results
        except Exception as exc:
            logger.warning("PostgreSQL pgvector query failed, falling back to manual similarity: %s", exc)

    # Fallback (e.g. SQLite in unit tests or if extension query fails)
    all_passages = (
        db.query(GuidelinePassage, Document.original_name)
        .join(Document, GuidelinePassage.document_id == Document.id)
        .filter(Document.status == "indexed")
        .all()
    )

    scored = []
    for passage, doc_name in all_passages:
        if passage.embedding is not None:
            emb_list = list(passage.embedding)
            sim = _cosine_similarity(query_vec, emb_list)
            if sim >= min_similarity:
                scored.append((sim, passage, doc_name))

    scored.sort(key=lambda x: x[0], reverse=True)
    for sim, passage, doc_name in scored[:limit]:
        results.append(RetrievedPassage(
            passage_id=passage.id,
            document_id=passage.document_id,
            document_name=doc_name,
            content=passage.content,
            heading_path=passage.heading_path,
            page_number=passage.page_number,
            char_offset_start=passage.char_offset_start,
            char_offset_end=passage.char_offset_end,
            similarity_score=round(sim, 4),
        ))

    return results
