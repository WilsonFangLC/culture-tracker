from typing import Optional, List
from pydantic import BaseModel

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