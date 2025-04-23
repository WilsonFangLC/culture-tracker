from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, Integer, ForeignKey


class GrowthMeasurement(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    passage_id: int = Field(foreign_key="passage.id", index=True)
    timestamp: str = Field(index=True)  # ISO format
    cell_density: float = Field(ge=0)
    notes: Optional[str] = Field(default=None)
    # Relationship
    passage: "Passage" = Relationship(back_populates="measurements")


class Passage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    start_time: str = Field(index=True)
    harvest_time: str = Field(index=True)
    seed_count: int = Field(ge=1)
    harvest_count: int = Field(ge=1)
    generation: Optional[float] = Field(default=None)
    doubling_time_hours: Optional[float] = Field(default=None)
    cumulative_pd: Optional[float] = Field(default=None)
    
    # Use Column for self-referential foreign key
    parent_id: Optional[int] = Field(sa_column=Column(Integer, ForeignKey("passage.id"), index=True))
    
    # Relationships
    parent: Optional["Passage"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": "Passage.id"}
    )
    children: List["Passage"] = Relationship(back_populates="parent")
    measurements: List[GrowthMeasurement] = Relationship(back_populates="passage") 