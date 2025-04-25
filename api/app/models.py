from datetime import datetime
from typing import Optional, Dict, List
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, JSON


class CellState(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(default="")
    timestamp: datetime = Field(default_factory=datetime.now)
    parent_id: Optional[int] = Field(default=None, foreign_key="cellstate.id")
    parameters: Dict = Field(default_factory=dict, sa_column=Column(JSON))
    notes: Optional[str] = Field(default=None)
    transition_type: Optional[str] = Field(default=None)
    
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