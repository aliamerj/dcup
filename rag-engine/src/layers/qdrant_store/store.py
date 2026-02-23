from typing import List
from qdrant_client.conversions.common_types import PointStruct
from src.infra import qdrant_client
from src.infra.redis_client import update_progress
from src.infra.text_model import COLLECTION_NAME, VECTOR_SIZE
from src.layers.chunking_embedding.models import Chunk


def store_chunks(chunks: List[Chunk], job_id: str, batch_size: int = 64) -> None:
    total = len(chunks)

    for i in range(0, total, batch_size):
        batch = chunks[i : i + batch_size]
        points: List[PointStruct] = []

        for chunk in batch:
            if chunk.dense_vectors is None or chunk.sparse_vectors is None:
                continue

            assert len(chunk.dense_vectors) == VECTOR_SIZE

            payload = {
                "_text": chunk.text,
                "_chunk_index": chunk.chunk_index,
                "_token_count": chunk.token_count,
                "_section_title": chunk.section_title,
                "_section_path": chunk.section_path,
                "_level": chunk.level,
                "_page_start": chunk.page_start,
                "_page_end": chunk.page_end,
                **chunk.metadata,
            }

            points.append(
                PointStruct(
                    id=chunk.id,
                    vector={
                        "text-dense": chunk.dense_vectors,
                        "text-sparse": chunk.sparse_vectors,
                    },
                    payload=payload,
                )
            )

        if points:
            qdrant_client.qclient.upsert(
                collection_name=COLLECTION_NAME,
                points=points,
                wait=True,
            )

        # progress update ONCE per batch
        update_progress(
            job_id=job_id,
            status="running",
            stage="storing",
            current=min(i + batch_size, total),
            total=total,
        )
