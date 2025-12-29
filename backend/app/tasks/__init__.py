"""Celery tasks module."""

from app.tasks.frame_extraction import extract_frames

__all__ = ["extract_frames"]
