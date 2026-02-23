import hashlib
import os
from fastapi import File, Form, HTTPException, UploadFile, status
from qdrant_client.models import Optional
import requests
from src.common.utils import parse_metadata
from src.infra.qdrant_client import document_exists
from urllib.parse import urlparse
from src.store.controllers.utils import assert_pdf, create_process_job


async def upload(
    upload: UploadFile = File(..., description="The file to upload"),
    metadata: Optional[str] = Form(..., description="Metadata for chunks (JSON)"),
):
    meta = parse_metadata(metadata)
    filename = upload.filename or "unkown.pdf"
    meta["_source_file"] = filename
    meta["_file_type"] = "pdf"

    data_bytes = await upload.read()
    assert_pdf(data_bytes)

    file_hash = hashlib.sha256(data_bytes).hexdigest()
    meta["_file_hash"] = file_hash
    user_id = meta.get("_user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing '_user_id' in metadata",
        )
    if document_exists(user_id, file_hash):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document already uploaded",
        )

    return create_process_job(data_bytes, meta, user_id, filename)


def with_url(
    url: str = Form(..., description="Link to fetch pdf"),
    metadata: Optional[str] = Form(..., description="Metadata for chunks (JSON)"),
):
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    if "application/pdf" not in resp.headers.get("Content-Type", ""):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "URL does not point to a PDF file"
        )
    data_bytes = resp.content
    assert_pdf(data_bytes)
    parsed = urlparse(url)
    meta = parse_metadata(metadata)
    filename = os.path.basename(parsed.path) or "unkown.pdf"

    meta["_source_file"] = filename
    meta["_file_type"] = "pdf"
    file_hash = hashlib.sha256(data_bytes).hexdigest()
    meta["_file_hash"] = file_hash
    user_id = meta.get("_user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing '_user_id' in metadata",
        )
    if document_exists(user_id, file_hash):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document already uploaded",
        )
    return create_process_job(data_bytes, meta, user_id, filename)
