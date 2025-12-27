.PHONY: help setup up down logs lint test clean

# Default target
help:
	@echo "Argus - Development Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  help    - Show this help message"
	@echo "  setup   - Initial setup"
	@echo "  up      - Start development environment"
	@echo "  down    - Stop development environment"
	@echo "  logs    - Show logs"
	@echo "  lint    - Run linters"
	@echo "  test    - Run tests"
	@echo "  clean   - Clean up"

# Initial setup
setup:
	@echo "Setting up development environment..."
	cd backend && uv sync
	cd frontend && pnpm install

# Start development environment
up:
	docker compose -f docker/docker-compose.yml up -d

# Stop development environment
down:
	docker compose -f docker/docker-compose.yml down

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
