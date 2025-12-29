.PHONY: help setup up up-dev down down-dev down-all logs lint lint-docker test test-docker clean ps supabase-start supabase-stop supabase-status

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
	@echo "  up        - Start infrastructure (Redis, MinIO)"
	@echo "  up-dev    - Start full dev environment (Supabase + infra + apps)"
	@echo "  down      - Stop infrastructure"
	@echo "  down-dev  - Stop full dev environment (Supabase + infra + apps)"
	@echo "  down-all  - Stop all services and remove volumes"
	@echo "  ps        - Show running containers"
	@echo "  logs      - Show logs"
	@echo ""
	@echo "Development:"
	@echo "  setup       - Initial setup (install dependencies)"
	@echo "  lint        - Run linters (local)"
	@echo "  lint-docker - Run linters (Docker)"
	@echo "  test        - Run tests (local)"
	@echo "  test-docker - Run tests (Docker)"
	@echo "  clean       - Clean up caches"

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

# Start full development environment
up-dev:
	@echo "Starting Supabase..."
	@npx supabase start || true
	@echo ""
	@echo "Starting Docker services..."
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up -d
	@echo ""
	@echo "Development environment started:"
	@echo "  Frontend:       http://localhost:$(FRONTEND_PORT)"
	@echo "  Backend:        http://localhost:$(BACKEND_PORT)"
	@echo "  Supabase API:   http://localhost:54331"
	@echo "  Supabase Studio: http://localhost:54333"
	@echo "  Inbucket (Mail): http://localhost:54334"
	@echo "  MinIO Console:  http://localhost:$(MINIO_CONSOLE_PORT)"

# Stop infrastructure
down:
	docker compose -f docker/docker-compose.yml down

# Stop full development environment
down-dev:
	@echo "Stopping Docker services..."
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml down
	@echo ""
	@echo "Stopping Supabase..."
	@npx supabase stop || true
	@echo ""
	@echo "Development environment stopped."

# Stop all and remove volumes
down-all:
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml down -v
	npx supabase stop --no-backup || true

# Show running containers
ps:
	docker compose -f docker/docker-compose.yml ps

# Show logs
logs:
	docker compose -f docker/docker-compose.yml logs -f

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

# Run linters (Docker)
lint-docker:
	@echo "Running backend linters in Docker..."
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
		run --rm backend uv run ruff check .
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
		run --rm backend uv run ruff format --check .
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
		run --rm backend uv run mypy .
	@echo "Running frontend linters in Docker..."
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
		run --rm frontend pnpm lint
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
		run --rm frontend pnpm format:check
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
		run --rm frontend pnpm typecheck

# Run tests (local)
test:
	@echo "Running backend tests..."
	cd backend && uv run pytest
	@echo "Running frontend tests..."
	cd frontend && pnpm test

# Run tests (Docker)
test-docker:
	@echo "Running backend tests in Docker..."
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
		run --rm backend uv run pytest
	@echo "Running frontend tests in Docker..."
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml \
		run --rm frontend pnpm test

# Clean up
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
