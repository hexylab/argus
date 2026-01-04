"""Celery application configuration."""

from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "argus",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.tasks.frame_extraction",
        "app.tasks.embedding_extraction",
        "app.tasks.auto_annotation",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    task_time_limit=3600,  # 1 hour timeout
    task_soft_time_limit=3300,  # 55 minutes soft timeout
)
