import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, engine, get_db
from app.seed import seed_database
from app.routers import (
    auth, attendance, leaves, employees, 
    analytics, reports, attachments, events, schedules, departments
)

logger = logging.getLogger("hrms.security")
logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    # Automatic DDL is only performed in development and testing.
    # Production databases rely on controlled versioned migrations.
    if settings.ENVIRONMENT != "production" and not os.getenv("TESTING"):
        try:
            Base.metadata.create_all(bind=engine)
            seed_database()
        except Exception as e:
            logger.warning(f"Development startup seed notice: {e}")
    yield

app = FastAPI(
    title="Expandit Attendance System",
    description="Attendance, analytics, and leave management system",
    version="1.0.0",
    lifespan=lifespan
)

# 1. Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "img-src 'self' data: blob:; "
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self'; "
        "connect-src 'self' https:;"
    )
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# 2. CORS: explicitly list deployed frontend origins through ALLOWED_ORIGINS.
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_env:
    origins = [origin.strip().rstrip("/") for origin in allowed_origins_env.split(",") if origin.strip()]
elif settings.ENVIRONMENT == "production":
    origins = []
else:
    origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

# Explicit production frontend origins. Keeping these in code avoids a missing or
# stale Render environment variable locking users out of the login page.
production_frontend_origins = [
    "https://epandit-hrms.vercel.app",
    "https://hrms-frontend-peach.vercel.app",
]
origins = list(dict.fromkeys(origins + production_frontend_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# 3. Global Exception Handler to prevent credential/traceback leaks
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Internal server exception processing {request.method} {request.url.path}: {exc}", exc_info=True)
    if settings.ENVIRONMENT == "production":
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An internal server error occurred. Please contact the system administrator."}
        )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc)}
    )

# Mount logo directory for branding access
logo_dir = Path(__file__).resolve().parent.parent.parent / "logo"
if logo_dir.exists():
    app.mount("/static/logo", StaticFiles(directory=str(logo_dir)), name="logo")

# Register Routers
app.include_router(auth.router)
app.include_router(attendance.router)
app.include_router(leaves.router)
app.include_router(employees.router)
app.include_router(analytics.router)
app.include_router(reports.router)
app.include_router(attachments.router)
app.include_router(events.router)
app.include_router(schedules.router)
app.include_router(departments.router)

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """Liveness and database connectivity check for monitoring services."""
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unhealthy", "database": "unavailable"},
        )
    return {
        "status": "healthy",
        "database": "connected",
        "system": "Expandit Attendance Management System",
        "company": settings.COMPANY_NAME,
        "timezone": settings.COMPANY_TIMEZONE
    }
