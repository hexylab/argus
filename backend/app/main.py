"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.deps import CurrentUser
from app.api.v1 import labels_router, projects_router, videos_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(projects_router, prefix="/api/v1")
app.include_router(labels_router, prefix="/api/v1")
app.include_router(videos_router, prefix="/api/v1")


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint for load balancers."""
    return {"status": "healthy"}


@app.get("/api/v1/me")
async def get_me(current_user: CurrentUser) -> dict[str, str]:
    """Get current authenticated user info."""
    return {
        "user_id": current_user.sub,
        "email": current_user.email or "",
    }
