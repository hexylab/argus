.PHONY: help setup up up-dev down down-all logs lint test clean ps

# Default target
help:
	@echo "Argus - Development Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  help      - Show this help message"
	@echo "  setup     - Initial setup (install dependencies)"
	@echo "  up        - Start infrastructure (DB, Redis, MinIO)"
	@echo "  up-dev    - Start full dev environment (infra + backend + frontend)"
	@echo "  down      - Stop infrastructure"
	@echo "  down-all  - Stop all services and remove volumes"
	@echo "  ps        - Show running containers"
	@echo "  logs      - Show logs"
	@echo "  lint      - Run linters"
	@echo "  test      - Run tests"
	@echo "  clean     - Clean up caches"

# Initial setup
setup:
	@echo "Setting up development environment..."
	cd backend && uv sync
	cd frontend && pnpm install

# Start infrastructure only (PostgreSQL, Redis, MinIO)
up:
	docker compose -f docker/docker-compose.yml up -d
	@echo ""
	@echo "Infrastructure started:"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  Redis:      localhost:6379"
	@echo "  MinIO API:  localhost:9000"
	@echo "  MinIO Console: localhost:9001"

# Start full development environment
up-dev:
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up -d
	@echo ""
	@echo "Development environment started:"
	@echo "  Frontend:   http://localhost:3000"
	@echo "  Backend:    http://localhost:8000"
	@echo "  MinIO Console: http://localhost:9001"

# Stop infrastructure
down:
	docker compose -f docker/docker-compose.yml down

# Stop all and remove volumes
down-all:
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml down -v

# Show running containers
ps:
	docker compose -f docker/docker-compose.yml ps

# Show logs
logs:
	docker compose -f docker/docker-compose.yml logs -f

# Run linters
lint:
	@echo "Running backend linters..."
	cd backend && uv run ruff check .
	cd backend && uv run ruff format --check .
	cd backend && uv run mypy .
	@echo "Running frontend linters..."
	cd frontend && pnpm lint
	cd frontend && pnpm format:check

# Run tests
test:
	@echo "Running backend tests..."
	cd backend && uv run pytest
	@echo "Running frontend tests..."
	cd frontend && pnpm test

# Clean up
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
