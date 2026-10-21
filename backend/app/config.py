import os
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

BASE_DIR = Path(__file__).resolve().parent.parent


def normalize_database_url(url: str) -> str:
    """Use the explicitly installed Psycopg 3 driver with SQLAlchemy."""
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


class Settings:
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").strip().lower()
    DATABASE_URL: str = normalize_database_url(os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://attendance_user:attendance_pass_2026@localhost:5432/attendance_system"
    ))

    # Production must never run with the public development signing key.
    _configured_secret = os.getenv("SECRET_KEY", "").strip()
    if ENVIRONMENT == "production" and len(_configured_secret) < 32:
        raise RuntimeError(
            "In production, set SECRET_KEY to a unique random value of at least 32 characters."
        )
    SECRET_KEY: str = _configured_secret or "local-development-only-change-before-deployment"
    INITIAL_ADMIN_PASSWORD: str = os.getenv("INITIAL_ADMIN_PASSWORD", "")

    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    COMPANY_NAME: str = os.getenv("COMPANY_NAME", "Expandit")
    COMPANY_TIMEZONE: str = os.getenv("COMPANY_TIMEZONE", "Asia/Kolkata")
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", str(BASE_DIR / "storage" / "uploads"))
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "5"))


settings = Settings()
