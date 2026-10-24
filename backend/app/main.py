import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import settings
from app.database import Base, engine
from app.seed import seed_database
from app.routers import (
    auth, attendance, leaves, employees, 
    analytics, reports, attachments, events, schedules, departments
)

# Initialize tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    try:
        seed_database()
    except Exception as e:
        print(f"Startup seed notice: {e}")
    yield

app = FastAPI(
    title="Expandit Attendance System",
    description="Attendance, analytics, and leave management system",
    version="1.0.0",
    lifespan=lifespan
)

# CORS: explicitly list deployed frontend origins through ALLOWED_ORIGINS.
# Development localhost origins are retained only outside production.
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
def health_check():
    """Liveness and database connectivity check for Render health monitoring."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
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
