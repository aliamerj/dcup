from dotenv import load_dotenv
from fastapi import FastAPI
from src.infra.qdrant_client import startupQdrant
from src.infra.redis_client import startupRedis
from src.store.routers import store_upload_router, store_url_router
from src.query.controller import query_router
from src.progress.controller import progress_router
from .logging import configure_logging, LogLevels
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware

env_path = Path(__file__).parent.parent / ".env"

load_dotenv(dotenv_path=env_path)
configure_logging(LogLevels.info)
startupRedis()
startupQdrant()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(store_upload_router)
app.include_router(store_url_router)
app.include_router(query_router)
app.include_router(progress_router)
