from sqlmodel import SQLModel, Session, create_engine
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

engine = create_engine(DATABASE_URL, echo=True)

def get_session():
    with Session(engine) as session:
        yield session

def create_db():
    """Create all database tables. Use with caution - this will drop existing tables."""
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)

# Create tables when this module is imported
if __name__ == "__main__":
    create_db() 