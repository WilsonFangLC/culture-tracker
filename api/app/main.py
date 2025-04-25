from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
import logging

from .models import (
    CellState,
)
from .database import engine, create_db, get_session
from .migrations import migrate_old_to_new
from .schemas import CellStateCreate, CellStateRead

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Cell Culture Tracker API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,  # Disable credentials for now
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database and run migrations
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up application...")
    try:
        create_db()
        migrate_old_to_new()
        logger.info("Database initialization and migration completed successfully")
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise

# Dependency to get database session
def get_session():
    with Session(engine) as session:
        yield session

@app.get("/")
async def root():
    return {"message": "Cell Culture Tracker API"}

@app.get("/states/", response_model=List[CellState])
def get_states(session: Session = Depends(get_session)):
    try:
        states = session.exec(select(CellState)).all()
        return states
    except Exception as e:
        logger.error(f"Error fetching states: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/states/{state_id}", response_model=CellState)
def get_state(state_id: int, session: Session = Depends(get_session)):
    state = session.get(CellState, state_id)
    if not state:
        raise HTTPException(status_code=404, detail="State not found")
    return state

@app.post("/states/", response_model=CellStateRead)
def create_state(state: CellStateCreate, session: Session = Depends(get_session)):
    try:
        db_state = CellState(
            timestamp=state.timestamp,
            parent_id=state.parent_id,
            parameters=state.parameters
        )
        session.add(db_state)
        session.commit()
        session.refresh(db_state)
        return db_state
    except Exception as e:
        logger.error(f"Error creating state: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/states/{state_id}", response_model=CellStateRead)
def update_state(
    state_id: int,
    state_update: dict,
    session: Session = Depends(get_session)
):
    try:
        db_state = session.get(CellState, state_id)
        if not db_state:
            raise HTTPException(status_code=404, detail="State not found")

        # Update parameters if provided
        if "parameters" in state_update:
            # Validate required parameters
            required_fields = ['status', 'temperature_c', 'volume_ml', 'location']
            for field in required_fields:
                if field not in state_update["parameters"]:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Missing required parameter: {field}"
                    )
            # Replace the entire parameters dictionary
            db_state.parameters = state_update["parameters"]

        session.add(db_state)
        session.commit()
        session.refresh(db_state)
        return db_state
    except Exception as e:
        logger.error(f"Error updating state: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 