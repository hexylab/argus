# Argus Backend

FastAPI + Celery backend for Argus AI Video Annotation SaaS.

## Development

```bash
# Install dependencies
uv sync

# Run linters
uv run ruff check .
uv run ruff format --check .

# Run type checker
uv run mypy .

# Run tests
uv run pytest
```
