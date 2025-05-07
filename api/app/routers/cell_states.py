from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime

from ..database import get_session
from ..crud import delete_cell_state
from ..models import CellState
from ..schemas import CellStateCreate, CellStateRead, CellStateUpdate
from ..calcs import calculate_measured_parameters

router = APIRouter(
    prefix="/cell_states",
    tags=["Cell States"]
)

@router.get("/cell_states", response_model=List[CellStateRead])
def get_cell_states(
    session: Session = Depends(get_session),
    limit: int = 1000
):
    query = select(CellState).limit(limit)
    states = session.exec(query).all()
    return states

@router.get("/cell_states/{state_id}", response_model=CellStateRead)
def get_cell_state(
    state_id: int,
    session: Session = Depends(get_session)
):
    state = get_cell_state_by_id(session, state_id)
    if not state:
        raise HTTPException(status_code=404, detail="Cell state not found")
    return state

@router.post("/cell_states", response_model=CellStateRead, status_code=status.HTTP_201_CREATED)
def create_cell_state(
    cell_state: CellStateCreate,
    session: Session = Depends(get_session)
):
    # Create the new state
    db_state = CellState(**cell_state.model_dump())
    session.add(db_state)
    session.commit()
    session.refresh(db_state)
    
    # If this state has a parent, and is not a measurement, we can calculate measured parameters for the parent
    if (db_state.parent_id and 
        db_state.parameters and 
        db_state.parameters.get('transition_parameters') and 
        db_state.parameters['transition_parameters'].get('operation_type') != 'measurement'):
        
        # Get the parent state
        parent_state = get_cell_state_by_id(session, db_state.parent_id)
        
        if parent_state:
            # Check if both parent and child have cell_density defined
            parent_density = parent_state.parameters.get('cell_density')
            child_density = db_state.parameters.get('cell_density')
            
            if (parent_density is not None and child_density is not None and
                isinstance(parent_density, (int, float)) and isinstance(child_density, (int, float)) and
                parent_density > 0 and child_density > 0):
                
                # Check if parent already has measured parameters (don't overwrite existing values)
                if not any(key.startswith('measured_') for key in parent_state.parameters.keys()):
                    try:
                        # Calculate measured parameters
                        measured_params = calculate_measured_parameters(
                            start_density=parent_density,
                            end_density=child_density,
                            start_time=str(parent_state.timestamp),
                            end_time=str(db_state.timestamp)
                        )
                        
                        # Update the parent state with measured parameters
                        parent_state.parameters.update(measured_params)
                        session.add(parent_state)
                        session.commit()
                        
                        print(f"Auto-calculated measured parameters for state {parent_state.id}: {measured_params}")
                    except Exception as e:
                        print(f"Error calculating measured parameters: {str(e)}")
    
    return db_state

@router.delete("/cell_states/{state_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cell_state(
    state_id: int,
    session: Session = Depends(get_session)
):
    state = get_cell_state_by_id(session, state_id)
    if not state:
        raise HTTPException(status_code=404, detail="Cell state not found")
    session.delete(state)
    session.commit()
    return None

def get_cell_state_by_id(session: Session, state_id: int) -> Optional[CellState]:
    """Helper function to get a cell state by ID"""
    return session.get(CellState, state_id) 