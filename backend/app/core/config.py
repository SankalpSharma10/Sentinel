import os

class Settings:
    PROJECT_NAME: str = "Sentinel Backend API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # In a real app, these would load from .env
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://sentinel:sentinel_password@localhost:5432/sentinel_db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "dummy_key_for_now")

settings = Settings()
