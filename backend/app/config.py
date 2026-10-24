import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def normalize_database_url(url: str) -> str:
    """Use the explicitly installed Psycopg 3 driver with SQLAlchemy."""
    if not url:
        return ""
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url

class Settings:
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").strip().lower()

    # Database configuration
    _raw_db_url = os.getenv("DATABASE_URL", "").strip()
    if ENVIRONMENT == "production":
        if not _raw_db_url or "localhost" in _raw_db_url or "127.0.0.1" in _raw_db_url:
            raise RuntimeError(
                "In production, DATABASE_URL must be configured with a secure remote PostgreSQL connection string."
            )
        DATABASE_URL: str = normalize_database_url(_raw_db_url)
    else:
        DATABASE_URL: str = normalize_database_url(
            _raw_db_url or "postgresql+psycopg://attendance_user:attendance_dev@localhost:5432/attendance_system"
        )

    # JWT Secret Key Validation
    _configured_secret = os.getenv("SECRET_KEY", "").strip()
    _insecure_defaults = {
        "",
        "local-development-only-change-before-deployment",
        "ci-only-secret-value-that-is-at-least-32-characters"
    }
    if ENVIRONMENT == "production":
        if len(_configured_secret) < 32 or _configured_secret in _insecure_defaults:
            raise RuntimeError(
                "In production, SECRET_KEY must be set to a unique, random string of at least 32 characters."
            )
    SECRET_KEY: str = _configured_secret or "local-development-only-change-before-deployment"

    # Initial Admin Setup Validation
    INITIAL_ADMIN_PASSWORD: str = os.getenv("INITIAL_ADMIN_PASSWORD", "").strip()
    if ENVIRONMENT == "production" and INITIAL_ADMIN_PASSWORD:
        if len(INITIAL_ADMIN_PASSWORD) < 9:
            raise RuntimeError("INITIAL_ADMIN_PASSWORD must be at least 9 characters long.")
        if not any(c.isalpha() for c in INITIAL_ADMIN_PASSWORD):
            raise RuntimeError("INITIAL_ADMIN_PASSWORD must contain at least one letter.")
        if not any(c.isdigit() for c in INITIAL_ADMIN_PASSWORD):
            raise RuntimeError("INITIAL_ADMIN_PASSWORD must contain at least one digit.")
        if not any(not c.isalnum() for c in INITIAL_ADMIN_PASSWORD):
            raise RuntimeError("INITIAL_ADMIN_PASSWORD must contain at least one special character.")

    INITIAL_ADMIN_USERNAME: str = os.getenv("INITIAL_ADMIN_USERNAME", "admin").strip() or "admin"
    INITIAL_ADMIN_EMAIL: str = os.getenv("INITIAL_ADMIN_EMAIL", "admin@expandit.com").strip().lower()

    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    COMPANY_NAME: str = os.getenv("COMPANY_NAME", "Expandit")
    COMPANY_TIMEZONE: str = os.getenv("COMPANY_TIMEZONE", "Asia/Kolkata")
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", str(BASE_DIR / "storage" / "uploads"))
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "5"))

settings = Settings()
