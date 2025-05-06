from typing import Optional, Dict, List
from pydantic import BaseModel
from datetime import datetime

class CellStateBase(BaseModel):
    name: str = ""
    timestamp: datetime
    parameters: Dict
    parent_id: Optional[int] = None

class CellStateCreate(CellStateBase):
    transition_type: Optional[str] = None
    additional_notes: Optional[str] = None

class CellStateUpdate(BaseModel):
    parameters: Optional[Dict] = None
    additional_notes: Optional[str] = None

class CellStateRead(CellStateBase):
    id: int
    transition_type: Optional[str] = None
    additional_notes: Optional[str] = None
    children: List["CellStateRead"] = []

    class Config:
        from_attributes = True

# Required for forward references
CellStateRead.model_rebuild() 