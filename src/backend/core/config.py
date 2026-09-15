"""Application settings.

All runtime configuration is read from environment variables (and the local
``.env`` file).  Environment variables always win over ``.env`` values, which
keeps production deployments and the test-suite (which injects its own values)
predictable.
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the Healthcare Assistant backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application -----------------------------------------------------
    app_name: str = "Healthcare Assistant API"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    debug: bool = False

    # --- Database --------------------------------------------------------
    # SQLite is the default so the project runs with zero external services.
    database_url: str = "sqlite:///./healthcare_assistant.db"
    auto_create_tables: bool = True

    # --- Security --------------------------------------------------------
    jwt_secret_key: str = "dev-only-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = Field(default=60 * 24, gt=0)

    # --- CORS ------------------------------------------------------------
    cors_allow_origins: list[str] = ["*"]

    @property
    def is_sqlite(self) -> bool:
        """Return ``True`` when the configured database is SQLite."""
        return self.database_url.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    """Return the cached :class:`Settings` instance."""
    return Settings()


settings = get_settings()
