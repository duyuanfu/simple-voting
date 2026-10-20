import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Universal Voting Platform API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "simple-voting-super-secret-jwt-key-2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_PATH: Path = BASE_DIR / "data" / "voting.db"
    
    # Uploads
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    MAX_VIDEO_SIZE_BYTES: int = 100 * 1024 * 1024  # 100 MB
    MAX_IMAGE_SIZE_BYTES: int = 10 * 1024 * 1024   # 10 MB
    
    # Anti-brushing defaults
    DEFAULT_IP_DAILY_LIMIT: int = 50
    DEFAULT_IP_BURST_LIMIT: int = 10  # max 10 requests per 10 seconds

    class Config:
        case_sensitive = True

settings = Settings()
