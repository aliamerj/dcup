import logging
import os
from qdrant_client import QdrantClient
from qdrant_client import models
from qdrant_client.conversions.common_types import SparseVectorParams
from qdrant_client.models import MatchValue
from qdrant_client.models import (
    Distance,
    FieldCondition,
    VectorParams,
)

qclient = QdrantClient(
    url=os.getenv("QDRANT_DB_URL", "http://localhost:6333"),
    api_key=os.getenv("QDRANT_DB_KEY"),
)

COLLECTION_NAME = "dcup_documents"
VECTOR_SIZE = 384


def startupQdrant():
    try:
        collections = qclient.get_collections().collections
        if COLLECTION_NAME not in [c.name for c in collections]:
            qclient.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config={
                    "text-dense": VectorParams(
                        size=VECTOR_SIZE,
                        distance=Distance.COSINE,
                    ),
                },
                sparse_vectors_config={
                    "text-sparse": SparseVectorParams(index=models.SparseIndexParams()),
                },
            )
            logging.info(
                f"create text-dense and text-sparse vectors in {COLLECTION_NAME}"
            )

            qclient.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name="_file_hash",
                field_schema=models.PayloadSchemaType.KEYWORD,
            )
            logging.info("create file_hash index payload")

            qclient.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name="_user_id",
                field_schema=models.PayloadSchemaType.KEYWORD,
            )
            logging.info("create user_id index payload")

        else:
            logging.info(f"{COLLECTION_NAME} qdrant collection is already existed")

        logging.info("qdrant connected successfully")

    except Exception as e:
        logging.error("qdrant connected failed", e)


def document_exists(user_id: str, file_hash: str) -> bool:
    results = qclient.scroll(
        collection_name=COLLECTION_NAME,
        scroll_filter=models.Filter(
            must=[
                FieldCondition(
                    key="_user_id",
                    match=MatchValue(value=user_id),
                ),
                FieldCondition(
                    key="_file_hash",
                    match=MatchValue(value=file_hash),
                ),
            ]
        ),
        limit=1,
    )

    return len(results[0]) > 0
