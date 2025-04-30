import os
from dotenv import load_dotenv  # Load environment variables from .env
load_dotenv()

from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine
from sqlalchemy import inspect, text
import logging

# Import models to ensure they are registered with SQLModel
from .models import CellState

logger = logging.getLogger(__name__)

# Read DATABASE_URL, default to SQLite for local dev if not set
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# Check if DATABASE_URL is set when not using the default SQLite path
# If it's not the default and not set, raise an error for deployment scenarios
if DATABASE_URL != "sqlite:///./app.db" and not os.getenv("DATABASE_URL"):
    raise ValueError("DATABASE_URL environment variable must be set for non-SQLite deployments.")

# Determine connect_args based on the database type
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Create database engine
engine: Engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args, # Use conditional args
    echo=True # Set echo=False for production later if desired
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

        # Remove SQLite-specific directory creation
        # if DATABASE_URL.startswith("sqlite:///"):
        #     db_path = DATABASE_URL.replace("sqlite:///\", \"\")
        #     os.makedirs(os.path.dirname(db_path), exist_ok=True)
        #     logger.info(f\"Ensured database directory exists at {os.path.dirname(db_path)}\")

        # Optionally, consider if you *always* want to drop/create tables
        # For production, you might want a more robust migration strategy
        # Drop all existing tables and recreate them (Use migrations like Alembic for production)
        # SQLModel.metadata.drop_all(engine) # Be careful with this in production
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