from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://nobroker_user:nobroker_pass@localhost:5432/nobroker_db"
    )
    DEBUG: bool = os.getenv("DEBUG", "True") == "True"
    API_HOST: str = os.getenv("API_HOST", "127.0.0.1")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    ADMIN_SECRET: str = os.getenv("ADMIN_SECRET", "changeme")

    class Config:
        env_file = ".env"

settings = Settings()

# Render gives postgresql:// but SQLAlchemy needs postgresql+psycopg2://
db_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# Create engine with connection pooling
engine = create_engine(
    db_url,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    echo=settings.DEBUG
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
