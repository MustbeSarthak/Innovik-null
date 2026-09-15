"""FastAPI routers for the healthcare assistant API."""

from backend.api.routes.auth import router as auth_router
from backend.api.routes.health_assessment import router as health_assessment_router

__all__ = ["auth_router", "health_assessment_router"]