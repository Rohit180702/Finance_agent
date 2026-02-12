from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""

    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Finance Agent API"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "FastAPI backend for Finance Agent - Technical, Fundamental, and Sentiment Analysis"

    # CORS Settings
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",  # Vite default port
        "http://localhost:5174",  # Vite alternative port
        "http://localhost:5175",  # Vite alternative port
        "http://localhost:3000",  # Alternative React port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:3000",
    ]

    class Config:
        case_sensitive = True


settings = Settings()

