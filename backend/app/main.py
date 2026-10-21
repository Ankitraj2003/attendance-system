import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine
from app.seed import seed_database
from app.routers import (
    auth, attendance, leaves, employees, 
    analytics, reports, attachments, events, schedules
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
    title="Expandit Smart Employee Attendance System",
    description="Enterprise attendance, real-time analytics, and leave management system",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount logo directory for branding access
logo_dir = Path("D:/Attendance_system/logo")
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



@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "system": "Expandit Attendance Management System",
        "company": settings.COMPANY_NAME,
        "timezone": settings.COMPANY_TIMEZONE
    }
