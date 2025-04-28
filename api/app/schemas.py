from typing import Optional, Dict, List
from pydantic import BaseModel, validator
from datetime import datetime

class CellStateBase(BaseModel):
    name: str = ""
    timestamp: datetime
    parameters: Dict
    parent_id: Optional[int] = None

    @validator('parameters')
    def validate_parameters(cls, v):
        required_fields = ['status', 'temperature_c', 'volume_ml', 'location']
        for field in required_fields:
            if field not in v:
                raise ValueError(f"Missing required parameter: {field}")
        return v

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