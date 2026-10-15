"""
Application Configuration Module using Pydantic Settings.
In production, configurations must be strictly typed, validated at startup,
and loaded from environment variables.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "UniCorePay Resilient Payment Engine"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",  # Vite default port
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    
    # Circuit Breaker Defaults
    CIRCUIT_BREAKER_FAILURE_THRESHOLD: int = 3
    CIRCUIT_BREAKER_COOLDOWN_SECONDS: int = 15
    
    # Initial Campus Wallet Balance
    INITIAL_WALLET_BALANCE: float = 2500.0

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
