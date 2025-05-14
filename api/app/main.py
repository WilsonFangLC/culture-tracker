from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Optional
from datetime import datetime, timezone
import logging
from dotenv import load_dotenv
import os

from .models import (
    CellState,
)
from .database import engine, create_db, get_session
from .migrations import migrate_old_to_new
from .schemas import CellStateCreate, CellStateRead, CellStateUpdate

# Import the new export router
from .routers import export as export_router
# Import the new cell_states router
from .routers import cell_states as cell_states_router
# Import the parameters router
from .routers import parameters as parameters_router

loaded_dotenv = load_dotenv() # Load environment variables from .env file
print(f"---DEBUG: load_dotenv() found file: {loaded_dotenv} ---")
database_url_value = os.getenv("DATABASE_URL")
print(f"---DEBUG: DATABASE_URL after load_dotenv: {database_url_value} ---")

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

# Include the export router
app.include_router(export_router.router, prefix="/api")
# Include the cell_states router
app.include_router(cell_states_router.router, prefix="/api")
# Include the parameters router
app.include_router(parameters_router.router, prefix="/api")

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

# Add a direct CSV export endpoint as a fallback
@app.get("/api/export/csv")
async def direct_export_csv(session: Session = Depends(get_session)):
    """Direct export endpoint as a fallback."""
    print("DIRECT_EXPORT_CSV called - using fallback route", flush=True)
    logger.error("DIRECT_EXPORT_CSV called - using fallback route")
    
    try:
        # Forward to the actual export function from the router
        result = await export_router.export_cell_states_csv(session=session)
        print(f"DIRECT_EXPORT_CSV success - returning StreamingResponse with type: {result.media_type}", flush=True)
        return result
    except Exception as e:
        error_msg = f"DIRECT_EXPORT_CSV failed with error: {str(e)}"
        print(error_msg, flush=True)
        logger.error(error_msg)
        # Return a simplified error response that browsers can display
        return {
            "error": "Failed to generate CSV export",
            "detail": str(e)
        }

@app.get("/")
async def root():
    return {"message": "Cell Culture Tracker API"}

@app.get("/api/states/", response_model=List[CellStateRead])
def get_states(session: Session = Depends(get_session)):
    try:
        db_states = session.exec(select(CellState)).all()
        processed_states = []
        for state in db_states:
            # Ensure timestamp is UTC-aware after loading
            if state.timestamp and state.timestamp.tzinfo is None:
                state.timestamp = state.timestamp.replace(tzinfo=timezone.utc)
            processed_states.append(state)
        return processed_states
    except Exception as e:
        logger.error(f"Error fetching states: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/states/{state_id}", response_model=CellState)
def get_state(state_id: int, session: Session = Depends(get_session)):
    state = session.get(CellState, state_id)
    if not state:
        raise HTTPException(status_code=404, detail="State not found")
    # Ensure timestamp is UTC-aware after loading
    if state.timestamp and state.timestamp.tzinfo is None:
        state.timestamp = state.timestamp.replace(tzinfo=timezone.utc)
    return state

@app.post("/api/states/", response_model=CellStateRead)
def create_state(state: CellStateCreate, session: Session = Depends(get_session)):
    try:
        logger.info(f"[create_state] Received state data. Timestamp from schema: {repr(state.timestamp)}")
        logger.info(f"[create_state] Parameters: {state.parameters}")
        if state.parameters and 'transition_parameters' in state.parameters:
            logger.info(f"[create_state] Found transition_parameters: {state.parameters['transition_parameters']}")
        else:
            logger.info("[create_state] No transition_parameters found in parameters.")
            
        if hasattr(state, 'transition_parameters'):
            logger.info(f"[create_state] Found root transition_parameters: {state.transition_parameters}")
        else:
            logger.info("[create_state] No root transition_parameters attribute.")

        db_state = CellState(
            name=state.name,
            timestamp=state.timestamp, # Assign timestamp from input
            parent_id=state.parent_id,
            parameters=state.parameters,
            transition_type=state.transition_type,
            additional_notes=state.additional_notes,
        )
        
        logger.info(f"[create_state] db_state object before add. Timestamp: {repr(db_state.timestamp)}")

        session.add(db_state)
        session.commit()
        
        logger.info(f"[create_state] State committed. ID: {db_state.id}")
        
        committed_state = session.get(CellState, db_state.id) 
        if committed_state:
             # Ensure timestamp is UTC-aware after loading
             if committed_state.timestamp and committed_state.timestamp.tzinfo is None:
                 committed_state.timestamp = committed_state.timestamp.replace(tzinfo=timezone.utc)
             logger.info(f"[create_state] State read back after commit (before refresh). Timestamp: {repr(committed_state.timestamp)}")
        else:
             logger.warning("[create_state] Failed to read back state immediately after commit.")


        session.refresh(db_state)
        # Ensure timestamp is UTC-aware after refresh
        if db_state.timestamp and db_state.timestamp.tzinfo is None:
            db_state.timestamp = db_state.timestamp.replace(tzinfo=timezone.utc)
        logger.info(f"[create_state] State refreshed. Timestamp: {repr(db_state.timestamp)}")
        
        return db_state
    except HTTPException as http_exc:
        raise http_exc # Re-raise validation errors
    except Exception as e:
        logger.error(f"Error creating state: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/states/{state_id}", response_model=CellStateRead)
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
        # Ensure timestamp is UTC-aware after refresh
        if db_state.timestamp and db_state.timestamp.tzinfo is None:
            db_state.timestamp = db_state.timestamp.replace(tzinfo=timezone.utc)
        logger.info(f"[5] State after refresh (id={db_state.id}), params: {db_state.parameters}") # Log 5 (Renamed from previous log)
        return db_state
    except HTTPException as http_exc:
        raise http_exc # Re-raise validation errors
    except Exception as e:
        logger.error(f"Error updating state {state_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 