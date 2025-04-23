from typing import Optional, List
from pydantic import BaseModel, validator
from datetime import datetime

class GrowthMeasurementBase(BaseModel):
    passage_id: int
    timestamp: str
    cell_density: float

class GrowthMeasurementCreate(GrowthMeasurementBase):
    pass

class GrowthMeasurementRead(GrowthMeasurementBase):
    id: int

    class Config:
        from_attributes = True


class FreezeEventBase(BaseModel):
    passage_id: int
    timestamp: str
    vial_count: int = 1
    label: Optional[str] = None

class FreezeEventCreate(FreezeEventBase):
    pass

class FreezeEventRead(FreezeEventBase):
    id: int

    class Config:
        from_attributes = True


class PassageBase(BaseModel):
    start_time: str
    harvest_time: str
    seed_count: int
    harvest_count: int
    parent_id: Optional[int] = None

    @validator('harvest_time')
    def harvest_time_must_be_later_than_start_time(cls, v, values):
        if 'start_time' in values:
            try:
                start = datetime.strptime(values['start_time'], "%Y-%m-%dT%H:%M")
                harvest = datetime.strptime(v, "%Y-%m-%dT%H:%M")
                if harvest <= start:
                    raise ValueError("harvest_time must be later than start_time")
            except ValueError as e:
                if "harvest_time must be later than start_time" in str(e):
                    raise
                raise ValueError("Invalid datetime format. Use ISO format: YYYY-MM-DDTHH:MM")
        return v

class PassageCreate(PassageBase):
    pass

class PassageRead(PassageBase):
    id: int
    generation: Optional[float]
    doubling_time_hours: Optional[float] = None  # Will be computed
    cumulative_pd: Optional[float] = None        # Will be computed

    class Config:
        from_attributes = True

# Extended read model that includes related data
class PassageReadExtended(PassageRead):
    measurements: List[GrowthMeasurementRead] = []
    freeze_events: List[FreezeEventRead] = []
    children: List["PassageRead"] = []

    class Config:
        from_attributes = True

# Required for forward reference to PassageRead
PassageReadExtended.model_rebuild() 