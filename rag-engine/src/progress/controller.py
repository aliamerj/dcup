import time
from typing import Set, cast
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from src.infra.redis_client import redis_client
import json


progress_router = APIRouter(tags=["Progress"])

@progress_router.get("/progress/{user_id}")
def stream_progress(user_id: str):

    def event_stream():
        last_payload = None

        while True:
            job_ids =cast(Set,redis_client.smembers(f"user:{user_id}:jobs"))
            jobs = []

            for job_id in job_ids:
                data = redis_client.hgetall(f"progress:{job_id}")
                if data:
                    jobs.append(data)

            payload = json.dumps(jobs, sort_keys=True)

            if payload != last_payload:
                yield f"data: {payload}\n\n"
                last_payload = payload

            time.sleep(1)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
    )
