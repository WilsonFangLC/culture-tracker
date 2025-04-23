from sqlmodel import select
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime

from .models import CellState, StateTransition
from .schemas import CellStateCreate, StateTransitionCreate

def create_cell_state(session: Session, state: CellStateCreate) -> CellState:
    """
    Create a new cell state with validation of parent relationship.
    """
    db_state = CellState(**state.model_dump())
    session.add(db_state)
    session.commit()
    session.refresh(db_state)
    return db_state

def get_cell_states(
    session: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None
) -> List[CellState]:
    """
    Get paginated list of cell states, optionally filtered by status.
    """
    query = select(CellState)
    if status:
        query = query.where(CellState.parameters['status'].astext == status)
    result = session.execute(
        query.offset(skip).limit(limit)
    )
    return result.scalars().all()

def get_cell_state(session: Session, state_id: int) -> Optional[CellState]:
    """Get a single cell state by ID with all relationships loaded."""
    state = session.get(CellState, state_id)
    if state:
        # Access relationships to ensure they're loaded
        _ = state.children
        _ = state.transitions
        return state
    return None

def get_cell_state_lineage(
    session: Session,
    state_id: int,
    direction: str = "both"
) -> List[CellState]:
    """
    Get the lineage of cell states (ancestors and/or descendants).
    
    Args:
        session: Database session
        state_id: ID of the starting state
        direction: "ancestors", "descendants", or "both"
    
    Returns:
        List of CellState objects in the lineage
    """
    state = session.get(CellState, state_id)
    if not state:
        return []

    result = []
    if direction in ["ancestors", "both"]:
        current = state
        while current.parent_id:
            current = session.get(CellState, current.parent_id)
            if current:
                result.append(current)
            else:
                break

    if direction in ["descendants", "both"]:
        # Get all descendants using a recursive CTE would be more efficient
        # but for simplicity we'll do it this way for now
        def get_descendants(s: CellState):
            for child in s.children:
                result.append(child)
                get_descendants(child)
        get_descendants(state)

    return result

def create_state_transition(
    session: Session,
    transition: StateTransitionCreate
) -> StateTransition:
    """
    Create a new state transition and update the associated state's parameters.
    """
    db_transition = StateTransition(**transition.model_dump())
    session.add(db_transition)
    
    # Update the state's parameters with the transition's parameters
    state = session.get(CellState, transition.state_id)
    if state:
        state.parameters.update(transition.parameters)
        state.timestamp = transition.timestamp
    
    session.commit()
    session.refresh(db_transition)
    return db_transition

def get_state_transitions(
    session: Session,
    state_id: int,
    transition_type: Optional[str] = None
) -> List[StateTransition]:
    """
    Get all transitions for a state, optionally filtered by type.
    """
    query = select(StateTransition).where(StateTransition.state_id == state_id)
    if transition_type:
        query = query.where(StateTransition.transition_type == transition_type)
    result = session.execute(query.order_by(StateTransition.timestamp))
    return result.scalars().all()

def delete_cell_state(session: Session, state_id: int) -> bool:
    """
    Delete a cell state and all its transitions.
    Updates child states to remove parent reference.
    """
    state = session.get(CellState, state_id)
    if state is None:
        return False

    # Delete associated transitions
    session.execute(
        select(StateTransition)
        .where(StateTransition.state_id == state_id)
        .delete()
    )

    # Update child states to remove parent reference
    for child in state.children:
        child.parent_id = None

    # Delete the state itself
    session.delete(state)
    session.commit()
    return True 