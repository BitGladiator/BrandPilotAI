"""SQLAlchemy database engine and session management."""
import logging
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.config import get_settings

logger = logging.getLogger("brandpilot.db")

Base = declarative_base()

_engine = None
_SessionFactory = None


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        db_url = settings.database_url

        connect_args = {}
        if db_url.startswith("sqlite"):
            connect_args["check_same_thread"] = False

        _engine = create_engine(
            db_url,
            connect_args=connect_args,
            pool_pre_ping=True,
        )
    return _engine


def get_session_factory():
    global _SessionFactory
    if _SessionFactory is None:
        engine = get_engine()
        _SessionFactory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return _SessionFactory


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for database sessions."""
    factory = get_session_factory()
    db = factory()
    try:
        yield db
    finally:
        db.close()


def ensure_vector_extension(db_session: Session) -> bool:
    """Attempt to enable pgvector extension if supported on PostgreSQL."""
    try:
        bind = db_session.get_bind()
        if bind.dialect.name == "postgresql":
            db_session.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            db_session.commit()
            return True
    except Exception as exc:
        db_session.rollback()
        logger.warning("Could not auto-create vector extension (might already exist or user lacks SUPERUSER): %s", exc)
    return False


def init_db():
    """Create all tables."""
    engine = get_engine()
    from app.db import models  # noqa: F401
    
    # Check if vector extension can be enabled
    try:
        with engine.connect() as conn:
            if engine.dialect.name == "postgresql":
                try:
                    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                    conn.commit()
                except Exception as exc:
                    logger.info("Notice when enabling vector extension: %s", exc)
    except Exception as e:
        logger.warning("Database connection during init_db: %s", e)

    Base.metadata.create_all(bind=engine)
