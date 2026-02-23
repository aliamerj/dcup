import os
import redis
import logging
import time
from rq import Queue

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

redis_client = redis.Redis.from_url(
    REDIS_URL,
    decode_responses=True,  # VERY important (strings not bytes)
)

processing_queue = Queue(
    name="processing",
    connection=redis_client,
)


def startupRedis():
    try:
        redis_client.ping()
        logging.info("Redis connected")
        processing_queue.empty()
        logging.info("Queue empty")
    except Exception as e:
        logging.error("Redis connection failed", e)
        raise

# Store

PROGRESS_TTL = 60 * 60  # 1 hour


def init_progress(
    job_id: str,
    *,
    user_id: str,
    file_name: str,
    file_type: str,
):
    pipe = redis_client.pipeline()

    pipe.hset(
        f"progress:{job_id}",
        mapping={
            "job_id": job_id,
            "user_id": user_id,
            "file_name": file_name,
            "file_type": file_type,
            "stage": "queued",
            "current": 0,
            "total": 0,
            "status": "queued",
        },
    )

    pipe.expire(f"progress:{job_id}", PROGRESS_TTL)
    pipe.sadd(f"user:{user_id}:jobs", job_id)
    pipe.execute()


def update_progress(
    job_id: str,
    *,
    stage: str,
    status: str,
    current: int | None = None,
    total: int | None = None,
):
    data = {
        "stage": stage,
        "status": status,
        "updated_at": int(time.time()),
    }

    if current is not None:
        data["current"] = current
    if total is not None:
        data["total"] = total

    redis_client.hset(f"progress:{job_id}", mapping=data)


def finish_progress(
    job_id: str,
    *,
    status: str,
    errMsg: str | None = None,
):
    data = {
        "status": status,
        "stage": "done" if status == "done" else "failed",
        "updated_at": int(time.time()),
    }

    if errMsg:
        data["error"] = errMsg

    key = f"progress:{job_id}"
    redis_client.hset(key, mapping=data)

    # auto cleanup later
    redis_client.expire(key, PROGRESS_TTL)
