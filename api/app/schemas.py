from typing import Optional, Dict, List
from pydantic import BaseModel, validator
from datetime import datetime

class CellStateBase(BaseModel):
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
    pass

class CellStateRead(CellStateBase):
    id: int
    children: List["CellStateRead"] = []
    transitions: List["StateTransitionRead"] = []

    class Config:
        from_attributes = True

class StateTransitionBase(BaseModel):
    timestamp: datetime
    transition_type: str
    parameters: Dict
    notes: Optional[str] = None

    @validator('transition_type')
    def validate_transition_type(cls, v):
        valid_types = {'freeze', 'thaw', 'passage', 'split', 'measurement', 'idle'}
        if v not in valid_types:
            raise ValueError(f"Invalid transition type. Must be one of: {valid_types}")
        return v

class StateTransitionCreate(StateTransitionBase):
    state_id: int

class StateTransitionRead(StateTransitionBase):
    id: int
    state_id: int

    class Config:
        from_attributes = True

# Required for forward references
CellStateRead.model_rebuild() 