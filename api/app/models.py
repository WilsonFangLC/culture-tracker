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
    
    # Relationships
    parent: Optional["CellState"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": "CellState.id"}
    )
    children: List["CellState"] = Relationship(back_populates="parent")
    transitions: List["StateTransition"] = Relationship(back_populates="state")


class StateTransition(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    state_id: int = Field(foreign_key="cellstate.id")
    timestamp: datetime = Field(default_factory=datetime.now)
    transition_type: str
    parameters: Dict = Field(default_factory=dict, sa_column=Column(JSON))
    notes: Optional[str] = Field(default=None)
    
    # Relationship
    state: CellState = Relationship(back_populates="transitions")


# Pydantic models for request/response validation
class StateTransitionBase(SQLModel):
    state_id: int
    transition_type: str
    parameters: Dict = Field(default_factory=dict)
    notes: Optional[str] = None

class StateTransitionCreate(StateTransitionBase):
    pass

class StateTransitionUpdate(SQLModel):
    transition_type: Optional[str] = None
    parameters: Optional[Dict] = None
    notes: Optional[str] = None

class StateTransitionRead(StateTransitionBase):
    id: int
    timestamp: datetime 