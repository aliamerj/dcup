import os
from urllib.parse import urlparse
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
import httpx
from qdrant_client.models import Optional
from src.store.model import StoreResponse
from src.store.controllers import pdf, md, csv, json, sheet

store_upload_router = APIRouter(prefix="/store/upload", tags=["Store_Upload"])
store_url_router = APIRouter(prefix="/store/url", tags=["Store_URL"])

FILE_HANDLERS = {
    "pdf": pdf,
    "md": md,
    "csv": csv,
    "json": json,
    "sheet": sheet,
}


@store_upload_router.post(
    "/all",
    summary="Upload and store file",
    status_code=status.HTTP_200_OK,
)
async def store_upload(
    upload: UploadFile = File(..., description="The file to upload"),
    metadata: Optional[str] = Form(..., description="Metadata for chunks (JSON)"),
):
    file_type = detect_file_type_from_upload(upload)

    if not file_type:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Content-Type: {upload.content_type}",
        )

    handler = FILE_HANDLERS[file_type]

    return await handler.upload(upload, metadata)


@store_url_router.post(
    "/all",
    summary="Store file from URL",
    status_code=status.HTTP_200_OK,
)
async def store_from_url(
    url: str = Form(..., description="Link to fetch"),
    metadata: Optional[str] = Form(..., description="Metadata for chunks (JSON)"),
):
    file_type = await get_extension_from_url(url)

    if not file_type:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    handler = FILE_HANDLERS[file_type]

    return handler.with_url(url, metadata)


# 1. PDF
@store_upload_router.post(
    "/pdf",
    summary="Store an uploaded PDF file",
    response_model=StoreResponse,
    status_code=status.HTTP_200_OK,
)
async def store_pdf_upload(
    upload: UploadFile = File(..., description="The file to upload"),
    metadata: Optional[str] = Form(..., description="Metadata for chunks (JSON)"),
):
    return await pdf.upload(upload, metadata)

@store_url_router.post(
    "/pdf",
    summary="Store an uploaded PDF file",
    response_model=StoreResponse,
    status_code=status.HTTP_200_OK,
)
def store_pdf_with_url(
    url: str = Form(..., description="Link to fetch"),
    metadata: Optional[str] = Form(..., description="Metadata for chunks (JSON)"),
):
    return pdf.with_url(url, metadata)


# 2. MDX
@store_upload_router.post(
    "/md",
    summary="Store an uploaded Markdown / MDX file",
    status_code=status.HTTP_200_OK,
)
async def store_md_upload(
    upload: UploadFile = File(..., description="Markdown or MDX file to upload"),
    metadata: Optional[str] = Form(None, description="Metadata for chunks (JSON)"),
):
    return await md.upload(upload, metadata)


@store_url_router.post(
    "/md",
    summary="Store a Markdown / MDX file from URL",
    status_code=status.HTTP_200_OK,
)
def store_md_with_url(
    url: str = Form(..., description="Link to fetch Markdown / MDX"),
    metadata: Optional[str] = Form(None, description="Metadata for chunks (JSON)"),
):
    return md.with_url(url, metadata)


# 3. CSV
@store_upload_router.post(
    "/csv",
    summary="Store an uploaded CSV file",
    status_code=status.HTTP_200_OK,
)
async def store_csv_upload(
    upload: UploadFile = File(..., description="CSV file to upload"),
    metadata: Optional[str] = Form(None, description="Metadata for chunks (JSON)"),
):
    return await csv.upload(upload, metadata)


@store_url_router.post(
    "/csv",
    summary="Store a SCV file from URL",
    status_code=status.HTTP_200_OK,
)
def store_csv_with_url(
    url: str = Form(..., description="Link to fetch CSV"),
    metadata: Optional[str] = Form(None, description="Metadata for chunks (JSON)"),
):
    return csv.with_url(url, metadata)


# 4. JSON
@store_upload_router.post(
    "/json",
    summary="Store an uploaded JSON file",
    status_code=status.HTTP_200_OK,
)
async def store_json_upload(
    upload: UploadFile = File(..., description="JSON file to upload"),
    metadata: Optional[str] = Form(None, description="Metadata for chunks (JSON)"),
):
    return await json.upload(upload, metadata)


@store_url_router.post(
    "/json",
    summary="Store a JSON file from URL",
    status_code=status.HTTP_200_OK,
)
def store_json_with_url(
    url: str = Form(..., description="Link to fetch JSON"),
    metadata: Optional[str] = Form(None, description="Metadata for chunks (JSON)"),
):
    return json.with_url(url, metadata)


# 5. Sheet
@store_upload_router.post(
    "/sheet",
    summary="Store an uploaded sheet file",
    status_code=status.HTTP_200_OK,
)
async def store_sheet_upload(
    upload: UploadFile = File(..., description="Sheet file to upload"),
    metadata: Optional[str] = Form(None, description="Metadata for chunks (JSON)"),
):
    return await sheet.upload(upload, metadata)


@store_url_router.post(
    "/sheet",
    summary="Store a Sheet file from URL",
    status_code=status.HTTP_200_OK,
)
def store_sheet_with_url(
    url: str = Form(..., description="Link to fetch Sheet"),
    metadata: Optional[str] = Form(None, description="Metadata for chunks (JSON)"),
):
    return sheet.with_url(url, metadata)



CONTENT_TYPE_MAP = {
    "application/pdf": "pdf",
    "text/markdown": "md",
    "text/plain": "md",
    "text/csv": "csv",
    "application/json": "json",
    "application/vnd.ms-excel": "sheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "sheet",
}

EXTENSION_MAP = {
    ".pdf": "pdf",
    ".md": "md",
    ".mdx":"md",
    ".markdown": "md",
    ".csv": "csv",
    ".json": "json",
    ".xlsx": "sheet",
    ".xls": "sheet",
}


def detect_file_type_from_upload(upload: UploadFile) -> str | None:
    content_type = (upload.content_type or "").split(";")[0]
    file_type = CONTENT_TYPE_MAP.get(content_type)

    if file_type:
        return file_type

    if not upload.filename:
        raise None

    ext = os.path.splitext(upload.filename)[1].lower()
    return EXTENSION_MAP.get(ext)


async def get_extension_from_url(url: str) -> str | None:
    async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
        response = await client.head(url)
        content_type = response.headers.get("content-type", "").split(";")[0]

    file_type = CONTENT_TYPE_MAP.get(content_type)
    if file_type:
        return file_type

    path = urlparse(url).path
    ext = os.path.splitext(path)[1].lower()
    return EXTENSION_MAP.get(ext)
