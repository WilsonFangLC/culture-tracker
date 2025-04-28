from datetime import datetime, timezone
from typing import Optional, Dict, List
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, JSON


class CellState(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(default="")
    # Use default DateTime column type for SQLite, keep Python type hint
    timestamp: datetime = Field()
    parent_id: Optional[int] = Field(default=None, foreign_key="cellstate.id")
    parameters: Dict = Field(default_factory=dict, sa_column=Column(JSON))
    notes: Optional[str] = Field(default=None)
    transition_type: Optional[str] = Field(default=None)
    additional_notes: Optional[str] = Field(default=None)
    # Remove created_by field
    # created_by: str = Field(index=True)
    
    # Relationships
    parent: Optional["CellState"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": "CellState.id"}
    )
    children: List["CellState"] = Relationship(back_populates="parent")


# Pydantic models for request/response validation
# class StateTransitionBase(SQLModel): ...
# class StateTransitionCreate(StateTransitionBase): ...
# class StateTransitionUpdate(SQLModel): ...
# class StateTransitionRead(StateTransitionBase): ... 