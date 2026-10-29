"""Secure local file storage for uploaded brand guidelines."""
import os
import re
import uuid
from pathlib import Path
from typing import Tuple

from app.config import get_settings


class StorageError(Exception):
    pass


def get_storage_path() -> Path:
    settings = get_settings()
    base_dir = Path(settings.document_storage_dir)
    if not base_dir.is_absolute():
        base_dir = Path(os.getcwd()) / base_dir
    base_dir.mkdir(parents=True, exist_ok=True)
    return base_dir


def sanitize_filename(filename: str) -> str:
    # Strip paths, control characters, and keep only safe characters
    name = Path(filename).name
    clean = re.sub(r"[^\w\s\.-]", "_", name)
    return clean or "document"


def save_upload_file(original_filename: str, file_bytes: bytes) -> Tuple[str, str]:
    """Saves file bytes to disk and returns (sanitized_stored_name, relative_internal_path)."""
    settings = get_settings()
    if len(file_bytes) > settings.max_upload_size_bytes:
        limit_mb = settings.max_upload_size_bytes // (1024 * 1024)
        raise StorageError(f"File size exceeds the {limit_mb} MB limit.")

    clean_orig = sanitize_filename(original_filename)
    extension = Path(clean_orig).suffix.lower()
    if extension not in {".pdf", ".docx", ".md", ".markdown"}:
        raise StorageError(f"Unsupported file format '{extension}'. Allowed: .pdf, .docx, .md")

    storage_dir = get_storage_path()
    file_uuid = str(uuid.uuid4())
    stored_filename = f"{file_uuid}{extension}"
    dest_path = storage_dir / stored_filename

    # Prevent path traversal
    try:
        dest_path.resolve().relative_to(storage_dir.resolve())
    except ValueError:
        raise StorageError("Invalid file path detected.")

    with open(dest_path, "wb") as f:
        f.write(file_bytes)

    return stored_filename, str(dest_path)


def delete_stored_file(stored_filename: str) -> bool:
    """Deletes stored file from disk."""
    storage_dir = get_storage_path()
    file_path = storage_dir / stored_filename
    try:
        if file_path.exists() and file_path.is_file():
            file_path.unlink()
            return True
    except Exception:
        pass
    return False


def read_stored_file(stored_filename: str) -> bytes:
    storage_dir = get_storage_path()
    file_path = storage_dir / stored_filename
    if not file_path.exists() or not file_path.is_file():
        raise StorageError("Stored file not found.")
    with open(file_path, "rb") as f:
        return f.read()
