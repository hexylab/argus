.PHONY: help setup up up-dev rebuild-dev down down-dev down-all logs lint lint-docker lint-backend-docker lint-frontend-docker test test-docker test-backend-docker test-frontend-docker ci ci-docker clean ps supabase-start supabase-stop supabase-status up-gpu down-gpu rebuild-gpu verify-gpu logs-gpu

# Load environment variables from docker/.env if exists
-include docker/.env

# Default values
FRONTEND_PORT ?= 3000
BACKEND_PORT ?= 8000
MINIO_API_PORT ?= 9000
MINIO_CONSOLE_PORT ?= 9001

# Default target
help:
	@echo "Argus - Development Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Supabase:"
	@echo "  supabase-start  - Start Supabase (PostgreSQL, Auth, Studio)"
	@echo "  supabase-stop   - Stop Supabase"
	@echo "  supabase-status - Show Supabase status and credentials"
	@echo ""
	@echo "Docker:"
	@echo "  up          - Start infrastructure (Redis, MinIO)"
	@echo "  up-dev      - Start full dev environment (Supabase + infra + apps)"
	@echo "  rebuild-dev - Rebuild and restart dev environment"
	@echo "  down        - Stop infrastructure"
	@echo "  down-dev    - Stop full dev environment (Supabase + infra + apps)"
	@echo "  down-all    - Stop all services and remove volumes"
	@echo "  ps          - Show running containers"
	@echo "  logs        - Show logs"
	@echo ""
	@echo "GPU (requires NVIDIA GPU + Container Toolkit):"
	@echo "  up-gpu      - Start dev environment with GPU worker"
	@echo "  down-gpu    - Stop GPU environment"
	@echo "  rebuild-gpu - Rebuild GPU worker"
	@echo "  verify-gpu  - Verify GPU environment"
	@echo "  logs-gpu    - Show GPU worker logs"
	@echo ""
	@echo "Development:"
	@echo "  setup                - Initial setup (install dependencies)"
	@echo "  lint                 - Run linters (local)"
	@echo "  lint-docker          - Run linters (Docker)"
	@echo "  lint-backend-docker  - Run backend linters (Docker)"
	@echo "  lint-frontend-docker - Run frontend linters (Docker)"
	@echo "  test                 - Run tests (local)"
	@echo "  test-docker          - Run tests (Docker)"
	@echo "  test-backend-docker  - Run backend tests (Docker)"
	@echo "  test-frontend-docker - Run frontend tests (Docker)"
	@echo "  ci                   - Run CI checks: lint + test (local)"
	@echo "  ci-docker            - Run CI checks: lint + test (Docker)"
	@echo "  clean                - Clean up caches"

# ===========================================
# Supabase Commands
# ===========================================

supabase-start:
	@echo "Starting Supabase..."
	npx supabase start
	@echo ""
	@echo "Supabase started! Run 'make supabase-status' to see credentials."

supabase-stop:
	@echo "Stopping Supabase..."
	npx supabase stop

supabase-status:
	npx supabase status

# ===========================================
# Docker Commands
# ===========================================

# Initial setup
setup:
	@echo "Setting up development environment..."
	cd backend && uv sync
	cd frontend && pnpm install

# Start infrastructure only (Redis, MinIO)
up:
	docker compose -f docker/docker-compose.yml up -d
	@echo ""
	@echo "Infrastructure started:"
	@echo "  Redis:        localhost:6379"
	@echo "  MinIO API:    localhost:$(MINIO_API_PORT)"
	@echo "  MinIO Console: localhost:$(MINIO_CONSOLE_PORT)"

# Start full development environment (with GPU workers)
up-dev:
	@echo "Starting Supabase..."
	@npx supabase start || true
	@echo ""
	@echo "Starting Docker services with GPU workers..."
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml -f docker/docker-compose.gpu.yml up -d
	@echo ""
	@echo "Development environment started:"
	@echo "  Frontend:       http://localhost:$(FRONTEND_PORT)"
	@echo "  Backend:        http://localhost:$(BACKEND_PORT)"
	@echo "  Supabase API:   http://localhost:54331"
	@echo "  Supabase Studio: http://localhost:54333"
	@echo "  Inbucket (Mail): http://localhost:54334"
	@echo "  MinIO Console:  http://localhost:$(MINIO_CONSOLE_PORT)"
	@echo "  SigLIP Worker:  Running (Celery queue: siglip)"
	@echo "  SAM3 Worker:    Running (Celery queue: sam3)"
	@echo ""
	@echo "Run 'make verify-gpu' to verify GPU environment."

# Rebuild and restart development environment (with GPU workers)
rebuild-dev:
	@echo "Rebuilding and restarting dev environment..."
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml -f docker/docker-compose.gpu.yml up -d --build
	@echo ""
	@echo "Development environment rebuilt and started:"
	@echo "  Frontend:       http://localhost:$(FRONTEND_PORT)"
	@echo "  Backend:        http://localhost:$(BACKEND_PORT)"
	@echo "  SigLIP Worker:  Running"
	@echo "  SAM3 Worker:    Running"

# Stop infrastructure
down:
	docker compose -f docker/docker-compose.yml down

# Stop full development environment (with GPU workers)
down-dev:
	@echo "Stopping Docker services..."
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml -f docker/docker-compose.gpu.yml down
	@echo ""
	@echo "Stopping Supabase..."
	@npx supabase stop || true
	@echo ""
	@echo "Development environment stopped."

# Stop all and remove volumes
down-all:
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml -f docker/docker-compose.gpu.yml down -v
	npx supabase stop --no-backup || true

# Show running containers
ps:
	docker compose -f docker/docker-compose.yml ps

# Show logs
logs:
	docker compose -f docker/docker-compose.yml logs -f

# ===========================================
# GPU Commands (requires NVIDIA GPU + Container Toolkit)
# ===========================================

# Start dev environment with GPU workers (SigLIP + SAM3)
up-gpu:
	@echo "Starting Supabase..."
	@npx supabase start || true
	@echo ""
	@echo "Starting Docker services with GPU workers..."
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml -f docker/docker-compose.gpu.yml up -d
	@echo ""
	@echo "GPU development environment started:"
	@echo "  Frontend:       http://localhost:$(FRONTEND_PORT)"
	@echo "  Backend:        http://localhost:$(BACKEND_PORT)"
	@echo "  SigLIP Worker:  Running (Celery queue: siglip)"
	@echo "  SAM3 Worker:    Running (Celery queue: sam3)"
	@echo ""
	@echo "Run 'make verify-gpu' to verify GPU environment."

# Stop GPU environment
down-gpu:
	@echo "Stopping Docker services..."
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml -f docker/docker-compose.gpu.yml down
	@echo ""
	@echo "Stopping Supabase..."
	@npx supabase stop || true
	@echo ""
	@echo "GPU environment stopped."

# Rebuild GPU workers
rebuild-gpu:
	@echo "Rebuilding GPU workers..."
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml -f docker/docker-compose.gpu.yml build siglip-worker sam3-worker
	@echo ""
	@echo "Restarting GPU workers..."
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml -f docker/docker-compose.gpu.yml up -d siglip-worker sam3-worker

# Verify GPU environment (using SigLIP worker)
verify-gpu:
	@echo "Verifying GPU environment..."
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml -f docker/docker-compose.gpu.yml \
		run --rm siglip-worker uv run python scripts/verify_gpu.py

# Show GPU workers logs
logs-gpu:
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml -f docker/docker-compose.gpu.yml \
		logs -f siglip-worker sam3-worker

# ===========================================
# Development Commands
# ===========================================

# Run linters (local)
lint:
	@echo "Running backend linters..."
	cd backend && uv run ruff check .
	cd backend && uv run ruff format --check .
	cd backend && uv run mypy .
	@echo "Running frontend linters..."
	cd frontend && pnpm lint
	cd frontend && pnpm format:check

# Run backend linters (Docker)
lint-backend-docker:
	@echo "Running backend linters in Docker..."
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
		run --rm backend uv run ruff check .
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
		run --rm backend uv run ruff format --check .
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
		run --rm backend uv run mypy .

# Run frontend linters (Docker)
lint-frontend-docker:
	@echo "Running frontend linters in Docker..."
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
		run --rm frontend pnpm lint
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
		run --rm frontend pnpm format:check
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
		run --rm frontend pnpm typecheck

# Run linters (Docker)
lint-docker: lint-backend-docker lint-frontend-docker

# Run tests (local)
test:
	@echo "Running backend tests..."
	cd backend && uv run pytest
	@echo "Running frontend tests..."
	cd frontend && pnpm test

# Run backend tests (Docker)
test-backend-docker:
	@echo "Running backend tests in Docker..."
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
		run --rm backend uv run pytest

# Run frontend tests (Docker)
test-frontend-docker:
	@echo "Running frontend tests in Docker..."
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
		run --rm frontend pnpm test

# Run tests (Docker)
test-docker: test-backend-docker test-frontend-docker

# CI equivalent (local)
ci: lint test

# CI equivalent (Docker)
ci-docker: lint-docker test-docker

# Clean up
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
