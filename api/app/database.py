from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine
from sqlalchemy import inspect, text
import os
import logging

# Import models to ensure they are registered with SQLModel
from .models import CellState, StateTransition

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# Create SQLite database engine
engine: Engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_session():
    with Session(engine) as session:
        yield session

def create_db():
    """
    Create all tables in the database if they don't exist.
    This is safe to call multiple times as it checks for existing tables.
    """
    try:
        logger.info(f"Initializing database at {DATABASE_URL}")
        
        # Create the database directory if it doesn't exist
        if DATABASE_URL.startswith("sqlite:///"):
            db_path = DATABASE_URL.replace("sqlite:///", "")
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
            logger.info(f"Ensured database directory exists at {os.path.dirname(db_path)}")

        # Drop all existing tables and recreate them
        SQLModel.metadata.drop_all(engine)
        SQLModel.metadata.create_all(engine)
        logger.info("Created all tables")

        # Test the connection
        with Session(engine) as session:
            session.execute(text("SELECT 1"))
            logger.info("Database connection test successful")

    except Exception as e:
        logger.error(f"Error creating tables: {str(e)}")
        raise

# Create tables when this module is imported
if __name__ == "__main__":
    create_db() 