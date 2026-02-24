import json
from fastapi import HTTPException, status
from qdrant_client.models import Optional


def parse_metadata(metadata_str: Optional[str]) -> dict:
    if not metadata_str:
        return {}

    try:
        parsed = json.loads(metadata_str)

        # If still string → decode again
        if isinstance(parsed, str):
            parsed = json.loads(parsed)

        if not isinstance(parsed, dict):
            raise ValueError("Metadata must be a JSON object")

        return parsed

    except (json.JSONDecodeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid JSON in metadata field",
        )
