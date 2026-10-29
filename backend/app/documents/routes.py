"""Brand guideline document management and upload routes."""
import os
from datetime import datetime
from typing import Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_optional_user
from app.config import get_settings
from app.db.models import Document, GuidelinePassage, User
from app.db.session import get_db
from app.documents.retrieval import process_and_index_document
from app.documents.storage import delete_stored_file, save_upload_file, StorageError

router = APIRouter(prefix="/documents", tags=["Brand Documents"])


class DocumentResponse(BaseModel):
    id: str
    filename: str
    original_name: str
    content_type: str
    file_size: int
    status: str
    error_message: Optional[str] = None
    extracted_metadata: Optional[dict] = None
    created_at: datetime
    uploaded_by_email: Optional[str] = None

    class Config:
        from_attributes = True


class PassageResponse(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    content: str
    page_number: Optional[int] = None
    heading_path: Optional[str] = None
    char_offset_start: Optional[int] = None
    char_offset_end: Optional[int] = None

    class Config:
        from_attributes = True


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    settings = get_settings()
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in {".pdf", ".docx", ".md", ".markdown"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Only PDF, DOCX, and Markdown (.md) files are permitted.",
        )

    # Read bytes and check size
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    if len(content) > settings.max_upload_size_bytes:
        limit_mb = settings.max_upload_size_bytes // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum upload size of {limit_mb} MB.",
        )

    try:
        stored_filename, _ = save_upload_file(filename, content)
    except StorageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    doc = Document(
        uploaded_by_id=current_user.id if current_user else None,
        filename=stored_filename,
        original_name=filename,
        content_type=file.content_type or "application/octet-stream",
        file_size=len(content),
        status="uploaded",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Process and index synchronously or in background
    # For reliable immediate indexing in hackathon workflow, process immediately so user sees result
    await process_and_index_document(doc.id, db, settings)
    db.refresh(doc)

    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        original_name=doc.original_name,
        content_type=doc.content_type,
        file_size=doc.file_size,
        status=doc.status,
        error_message=doc.error_message,
        extracted_metadata=doc.extracted_metadata,
        created_at=doc.created_at,
        uploaded_by_email=current_user.email if current_user else None,
    )


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    results = []
    for doc in docs:
        uploader_email = doc.uploaded_by.email if doc.uploaded_by else None
        results.append(DocumentResponse(
            id=doc.id,
            filename=doc.filename,
            original_name=doc.original_name,
            content_type=doc.content_type,
            file_size=doc.file_size,
            status=doc.status,
            error_message=doc.error_message,
            extracted_metadata=doc.extracted_metadata,
            created_at=doc.created_at,
            uploaded_by_email=uploader_email,
        ))
    return results


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    uploader_email = doc.uploaded_by.email if doc.uploaded_by else None
    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        original_name=doc.original_name,
        content_type=doc.content_type,
        file_size=doc.file_size,
        status=doc.status,
        error_message=doc.error_message,
        extracted_metadata=doc.extracted_metadata,
        created_at=doc.created_at,
        uploaded_by_email=uploader_email,
    )


@router.get("/{document_id}/passages", response_model=list[PassageResponse])
def get_document_passages(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    passages = (
        db.query(GuidelinePassage)
        .filter(GuidelinePassage.document_id == document_id)
        .order_by(GuidelinePassage.chunk_index.asc())
        .all()
    )
    return [PassageResponse.model_validate(p) for p in passages]


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    # Authorization: if document has an owner and user is authenticated creator, check match
    if doc.uploaded_by_id and current_user:
        if current_user.role == "creator" and doc.uploaded_by_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this document.")

    # Delete disk file
    delete_stored_file(doc.filename)

    # Delete DB row (cascades to guideline_passages)
    db.delete(doc)
    db.commit()

    return {"status": "ok", "message": f"Document '{doc.original_name}' deleted."}
