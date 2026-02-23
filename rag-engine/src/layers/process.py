from rq import get_current_job
from src.infra.redis_client import finish_progress, update_progress
from src.layers.chunking_embedding.chunk_document import chunk_document
from src.layers.chunking_embedding.embedding import embed_chunks
from src.layers.data_extractor.extractor.csv import extract_data_csv
from src.layers.data_extractor.extractor.json import extract_data_json
from src.layers.data_extractor.extractor.md import extract_data_md
from src.layers.data_extractor.extractor.pdf import extract_data_pdf
from src.layers.data_extractor.extractor.xls import extract_data_excel
import logging

from src.layers.qdrant_store.store import store_chunks
from src.layers.structure_analyzer.analyzer import analyze_layout


def process_job(file_bytes: bytes, metadata: dict):
    job = get_current_job()
    if not job:
        raise Exception("shoud use with job")
    job_id = job.get_id()

    file_type = metadata.get("_file_type")
    if not file_type:
        raise Exception("job without id or without file_type")

    try:
        update_progress(job_id, stage="extracting", status="running")
        pages, extractor_meta = [], {}
        match file_type:
            case "pdf":
                pages, extractor_meta = extract_data_pdf(file_bytes, job_id)
            case "md":
                pages, extractor_meta = extract_data_md(file_bytes, job_id)
            case "json":
                pages, extractor_meta = extract_data_json(file_bytes, job_id)
            case "csv":
                pages, extractor_meta = extract_data_csv(file_bytes, job_id)
            case "sheet":
                pages, extractor_meta = extract_data_excel(file_bytes, job_id)
            case _:
                Exception("unsupported file type")
        logging.info(f"{file_type} data extracted pages: {len(pages)}")
        structured_document = analyze_layout(pages, job_id=job_id)
        logging.info(f"analyzed {file_type} structured")
        chunks = chunk_document(
            structured_document,
            metadata | extractor_meta,
            job_id=job_id,
            max_tokens=450,
            min_tokens=80,
        )
        logging.info(f"chunked {file_type} to : {len(chunks)} chunks")
        chunks = embed_chunks(chunks, job_id=job_id)
        logging.info("embedding chunks")
        store_chunks(chunks, job_id=job_id)
        logging.info("stored chunked")
        finish_progress(job_id, status="done")

    except Exception as e:
        logging.exception(f"Unexpected error in processing, {str(e)} ")
        finish_progress(job_id, status="failed", errMsg=str(e))
        raise
