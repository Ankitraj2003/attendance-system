import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+psycopg://attendance_user:attendance_pass_2026@localhost:5432/attendance_system"
    )
    SECRET_KEY: str = os.getenv("SECRET_KEY", "expandit_attendance_secret_jwt_key_2026_super_secure_production_ready")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    COMPANY_NAME: str = os.getenv("COMPANY_NAME", "Expandit")
    COMPANY_TIMEZONE: str = os.getenv("COMPANY_TIMEZONE", "Asia/Kolkata")
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", str(BASE_DIR / "storage" / "uploads"))
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "5"))

settings = Settings()
