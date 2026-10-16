from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "EcoLoop API"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8000
    FIREBASE_PROJECT_ID: str | None = None
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    MAX_REQUEST_BYTES: int = 256_000

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return [str(origin).rstrip("/") for origin in v]
        raise ValueError("CORS origins must be a list or comma-separated string")

    @field_validator("BACKEND_CORS_ORIGINS")
    @classmethod
    def validate_cors_origins(cls, origins: List[str]) -> List[str]:
        if "*" in origins:
            raise ValueError("Wildcard CORS origins are not permitted")
        return origins

    @field_validator("MAX_REQUEST_BYTES")
    @classmethod
    def validate_request_limit(cls, size: int) -> int:
        if not 1_024 <= size <= 2_000_000:
            raise ValueError("MAX_REQUEST_BYTES must be between 1 KiB and 2 MiB")
        return size

    model_config = SettingsConfigDict(
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
