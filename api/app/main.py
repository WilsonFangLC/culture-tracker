from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from .database import engine
from .models import Passage
from .routers import passages

app = FastAPI(title="Lab Passage Tracker")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include passages router
app.include_router(
    passages.router,
    prefix="/passages",
    tags=["passages"],
)

# Create tables
Passage.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "Lab Passage Tracker API"}

@app.get("/health")
def health_check():
    """
    Health check endpoint to monitor the backend status.
    Returns:
        dict: Status information including:
            - status: "healthy" if the API is running
            - database: "connected" if database connection is working
    """
    try:
        # Test database connection
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        } 