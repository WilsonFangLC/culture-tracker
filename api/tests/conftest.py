import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlmodel import SQLModel, Session
from typing import Generator, Any

# Adjust the import path based on your project structure
# This assumes your main app object is accessible for the TestClient
# For FastAPI, you'd typically import your `app` instance
from app.main import app  # Assuming your FastAPI app instance is here
from app.database import get_session, DATABASE_URL as ORIGINAL_DATABASE_URL, engine as original_engine

# Define the test database URL
TEST_DATABASE_URL = "sqlite:///./test_app.db"


@pytest.fixture(scope="session", autouse=True)
def test_db_setup_session():
    """
    Session-scoped fixture to:
    1. Set DATABASE_URL environment variable for the test session.
    2. Create the test database and tables once per session.
    3. Clean up the test database file after the entire test session.
    """
    original_env_db_url = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL

    # Create a new engine for the test database
    # The actual file will be created relative to where pytest is run.
    # If pytest is run from 'api/' directory, test_app.db will be in 'api/'.
    db_file_path = TEST_DATABASE_URL.replace("sqlite:///./", "") # e.g., "test_app.db"
    
    # Ensure the directory for the test_app.db exists if it's specified with a path
    # For "./test_app.db", the directory is the current working directory of pytest
    # db_dir = os.path.dirname(db_file_path)
    # if db_dir and not os.path.exists(db_dir):
    #     os.makedirs(db_dir)

    test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(test_engine)
    print(f"Test database schema created at {TEST_DATABASE_URL}")

    yield  # This is where the testing happens

    # Teardown: Close connections and delete the test database file
    if hasattr(test_engine, 'dispose'):
        test_engine.dispose()
    
    # Construct absolute path for removal if needed, but relative should work if CWD is 'api/'
    if os.path.exists(db_file_path): 
        os.remove(db_file_path)
        print(f"Test database {db_file_path} removed.")
    else:
        print(f"Test database file {db_file_path} not found for removal. CWD: {os.getcwd()}")


    # Restore original DATABASE_URL if it was set
    if original_env_db_url is None:
        if "DATABASE_URL" in os.environ: # Ensure key exists before deleting
             del os.environ["DATABASE_URL"]
    else:
        os.environ["DATABASE_URL"] = original_env_db_url


@pytest.fixture(scope="function")
def db_session(test_db_setup_session: None) -> Generator[Session, Any, None]:
    """
    Function-scoped fixture to provide a clean database session for each test.
    It uses a new engine for each session to ensure isolation if needed,
    but reuses the test_db_setup_session for overall DB creation/deletion.
    """
    test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    
    # The connection should be managed carefully.
    # For each test, we want a transaction that can be rolled back.
    connection = test_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback() # Rollback changes after each test
    connection.close()
    if hasattr(test_engine, 'dispose'): # Dispose engine created in this fixture
        test_engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: Session) -> AsyncClient:
    """
    Provides an HTTP client for making API requests to the test app.
    It uses the db_session fixture to ensure database operations within tests
    are handled correctly (e.g., within a transaction that gets rolled back).
    """

    # Override the app's get_session dependency to use the test_db_session
    # This ensures that API endpoints use the test database session
    def get_test_session_override():
        yield db_session

    original_dependency = app.dependency_overrides.get(get_session)
    app.dependency_overrides[get_session] = get_test_session_override

    # Use ASGITransport
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        yield ac

    # Clear the override after the test, restoring original if any
    if original_dependency:
        app.dependency_overrides[get_session] = original_dependency
    else:
        del app.dependency_overrides[get_session] 