from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

engine = create_engine(DATABASE_URL, echo=True)  # Enable SQL logging
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_session():
    with SessionLocal() as session:
        yield session

def create_db():
    """Create all database tables. Use with caution - this will drop existing tables."""
    # Import all models to ensure they are registered with SQLModel
    from .models import Passage, GrowthMeasurement
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)

# Create tables when this module is imported
if __name__ == "__main__":
    create_db() 