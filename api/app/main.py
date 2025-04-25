from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Optional
from datetime import datetime
import logging

from .models import (
    CellState,
)
from .database import engine, create_db, get_session
from .migrations import migrate_old_to_new
from .schemas import CellStateCreate, CellStateRead, CellStateUpdate

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

@app.get("/states/", response_model=List[CellStateRead])
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
        # TEMPORARY: Remove the check for created_by
        # if not state.created_by:
        #      raise HTTPException(status_code=400, detail="'created_by' field is required during state creation.")

        db_state = CellState(
            name=state.name,
            timestamp=state.timestamp,
            parent_id=state.parent_id,
            parameters=state.parameters,
            transition_type=state.transition_type, # Keep for now
            additional_notes=state.additional_notes, # Add notes
            # created_by=state.created_by # Remove assignment from state
            # Set a default or handle created_by differently if needed later
            created_by="unknown" # Set a temporary default value for now
        )
        session.add(db_state)
        session.commit()
        session.refresh(db_state)
        return db_state
    except HTTPException as http_exc:
        raise http_exc # Re-raise validation errors
    except Exception as e:
        logger.error(f"Error creating state: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/states/{state_id}", response_model=CellStateRead)
def update_state(
    state_id: int,
    state_update: CellStateUpdate, # Use the new update schema
    session: Session = Depends(get_session)
):
    try:
        # logger.info(f"--- Entering update_state for state_id: {state_id} ---") # Replace logger
        print(f"--- Entering update_state for state_id: {state_id} ---", flush=True) # Use print with flush
        db_state = session.get(CellState, state_id)
        if not db_state:
            raise HTTPException(status_code=404, detail="State not found")
        logger.info(f"[1] State fetched (id={db_state.id}), params: {db_state.parameters}") # Log 1

        update_data = state_update.model_dump(exclude_unset=True)

        # Update parameters if provided by merging
        if "parameters" in update_data:
            incoming_params = update_data["parameters"]
            if not isinstance(incoming_params, dict):
                 raise HTTPException(status_code=400, detail="'parameters' must be an object")

            current_params = db_state.parameters
            if current_params is None:
                current_params = {}
            elif not isinstance(current_params, dict):
                logger.warning(f"Existing parameters for state {state_id} is not a dict. Resetting.")
                current_params = {}

            new_params = current_params.copy()
            new_params.update(incoming_params)
            logger.info(f"[2] Updated params generated: {new_params}") # Log 2

            db_state.parameters = new_params # Assign the new dictionary
            logger.info(f"[3] State after assignment (id={db_state.id}), params: {db_state.parameters}") # Log 3

        # Update additional_notes if provided
        if "additional_notes" in update_data:
            db_state.additional_notes = update_data["additional_notes"]

        # Potentially add other updatable fields like name here
        # if "name" in update_data:
        #     db_state.name = update_data["name"]

        if not update_data:
            # No actual updates were provided
             raise HTTPException(status_code=400, detail="No update data provided.")

        session.add(db_state)
        session.commit()
        logger.info(f"[4] State after commit (id={db_state.id}), params: {db_state.parameters}") # Log 4

        session.refresh(db_state)
        logger.info(f"[5] State after refresh (id={db_state.id}), params: {db_state.parameters}") # Log 5 (Renamed from previous log)
        return db_state
    except HTTPException as http_exc:
        raise http_exc # Re-raise validation errors
    except Exception as e:
        logger.error(f"Error updating state {state_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 