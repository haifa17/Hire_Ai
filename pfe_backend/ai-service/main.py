from __future__ import annotations

import logging

from fastapi import FastAPI

from app.api.routers.ats import router as ats_router
from app.api.routers.matching import router as matching_router
from app.api.routers.job_offer import router as job_offer_router
from app.api.routers.health import router as health_router
from app.api.routers.resume import router as resume_router
from app.api.routers.recommendation import router as recommendation_router
from app.config.settings import get_settings
from app.core.exceptions import register_exception_handlers
from app.observability.langsmith_tracing import configure_langsmith

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)


from contextlib import asynccontextmanager
from app.db.session import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    try:
        await init_db()
        logging.info("Database tables initialized successfully.")
    except Exception as e:
        logging.exception(f"Error initializing database tables: {e}")
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    try:
        configure_langsmith(settings)
    except Exception as exc:  # observability must never prevent startup
        logging.warning(f"LangSmith configuration failed, continuing without tracing: {exc}")
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    register_exception_handlers(app)
    app.include_router(health_router)
    app.include_router(resume_router)
    app.include_router(job_offer_router)
    app.include_router(ats_router)
    app.include_router(matching_router)
    app.include_router(recommendation_router)
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(app, host=settings.app_host, port=settings.app_port)

