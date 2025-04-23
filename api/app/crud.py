from sqlmodel import select
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import delete

from .models import Passage, GrowthMeasurement, FreezeEvent
from .schemas import PassageCreate, GrowthMeasurementCreate, FreezeEventCreate
from .calcs import calc_generation, calc_doubling_time_hours, calc_cumulative_pd

def create_passage(session: Session, passage: PassageCreate) -> Passage:
    # Calculate this passage's PD
    pd = calc_generation(passage.seed_count, passage.harvest_count)
    
    # If there's a parent, get its cumulative PD
    parent_cumulative_pd = None
    if passage.parent_id is not None:
        parent = session.get(Passage, passage.parent_id)
        if parent:
            parent_cumulative_pd = parent.cumulative_pd

    # Create the passage with computed fields
    db_passage = Passage(
        **passage.model_dump(),
        generation=pd,
        doubling_time_hours=calc_doubling_time_hours(
            passage.start_time,
            passage.harvest_time,
            pd
        ),
        cumulative_pd=calc_cumulative_pd(pd, parent_cumulative_pd)
    )
    session.add(db_passage)
    session.commit()
    session.refresh(db_passage)
    return db_passage

def get_passages(session: Session, skip: int = 0, limit: int = 100) -> List[Passage]:
    result = session.execute(
        select(Passage)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

def get_passage(session: Session, passage_id: int) -> Optional[Passage]:
    """Get a single passage by ID."""
    return session.get(Passage, passage_id)

def get_passage_with_related(session: Session, passage_id: int) -> Optional[Passage]:
    """
    Get a passage with all its related data (measurements, freeze events, children).
    SQLModel will automatically load relationships thanks to the Relationship definitions.
    """
    passage = session.get(Passage, passage_id)
    if passage:
        # Access relationships to ensure they're loaded
        _ = passage.measurements
        _ = passage.freeze_events
        _ = passage.children
        return passage
    return None

def create_growth_measurement(
    session: Session,
    measurement: GrowthMeasurementCreate
) -> GrowthMeasurement:
    db_measurement = GrowthMeasurement(**measurement.model_dump())
    session.add(db_measurement)
    session.commit()
    session.refresh(db_measurement)
    return db_measurement

def get_passage_measurements(
    session: Session,
    passage_id: int
) -> List[GrowthMeasurement]:
    result = session.execute(
        select(GrowthMeasurement)
        .where(GrowthMeasurement.passage_id == passage_id)
        .order_by(GrowthMeasurement.timestamp)
    )
    return result.scalars().all()

def create_freeze_event(
    session: Session,
    freeze_event: FreezeEventCreate
) -> FreezeEvent:
    db_event = FreezeEvent(**freeze_event.model_dump())
    session.add(db_event)
    session.commit()
    session.refresh(db_event)
    return db_event

def get_passage_freeze_events(
    session: Session,
    passage_id: int
) -> List[FreezeEvent]:
    result = session.execute(
        select(FreezeEvent)
        .where(FreezeEvent.passage_id == passage_id)
        .order_by(FreezeEvent.timestamp)
    )
    return result.scalars().all()

def delete_passage(session: Session, passage_id: int) -> bool:
    """
    Delete a passage and all its related data (measurements, freeze events).
    Also updates any child passages to remove the parent reference.
    
    Args:
        session: Database session
        passage_id: ID of passage to delete
        
    Returns:
        bool: True if passage was deleted, False if not found
    """
    passage = session.get(Passage, passage_id)
    if passage is None:
        return False

    # Delete associated growth measurements and freeze events explicitly
    session.execute(delete(GrowthMeasurement).where(GrowthMeasurement.passage_id == passage_id))
    session.execute(delete(FreezeEvent).where(FreezeEvent.passage_id == passage_id))

    # Update child passages to remove parent reference
    for child in passage.children:
        child.parent_id = None

    # Delete the passage itself
    session.delete(passage)
    session.commit()
    return True 