from concurrent.futures import ThreadPoolExecutor
import os
from typing import List
from qdrant_client.models import models
from src.infra.redis_client import update_progress
from src.layers.chunking_embedding.models import Chunk
from src.infra.text_model import dense_embedding, sparse_embedding


_executor = ThreadPoolExecutor(max_workers=os.cpu_count() or 4)


def embed_chunks(chunks: List[Chunk], job_id: str, batch_size: int = 64) -> List[Chunk]:
    update_progress(
        job_id=job_id,
        status="running",
        stage="embedding",
        current=0,
        total=len(chunks),
    )

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]

        texts = []
        for c in batch:
            path = " > ".join(c.section_path) if c.section_path else ""
            title = c.section_title or ""

            text = f"""passage:
Title: {title}
Path: {path}
File Name : {c.metadata["_source_file"]}
page: {c.page_start} - {c.page_end}

{c.text.strip()}
"""
            texts.append(text)

        def dense_task():
            return list(dense_embedding.embed(texts))

        def sparse_task():
            return list(sparse_embedding.embed(texts))

        future_dense = _executor.submit(dense_task)
        future_sparse = _executor.submit(sparse_task)

        dense_vectors = future_dense.result()
        sparse_vectors = future_sparse.result()

        for chunk_number, (chunk, dv, sv) in enumerate(
            zip(batch, dense_vectors, sparse_vectors), start=1
        ):
            chunk.dense_vectors = dv.tolist()
            chunk.sparse_vectors = models.SparseVector(
                indices=sv.indices.tolist(),
                values=sv.values.tolist(),
            )
            update_progress(
                job_id=job_id,
                status="running",
                stage="embedding",
                current=chunk_number + i,
                total=len(chunks),
            )

    return chunks
