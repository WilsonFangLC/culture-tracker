from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_session
from ..models import Passage, GrowthMeasurement, FreezeEvent
from ..schemas import (
    PassageCreate,
    PassageRead,
    PassageReadExtended,
    GrowthMeasurementCreate,
    GrowthMeasurementRead,
    FreezeEventCreate,
    FreezeEventRead,
)
from ..crud import (
    create_passage,
    get_passages,
    get_passage_with_related,
    create_growth_measurement,
    get_passage_measurements,
    create_freeze_event,
    get_passage_freeze_events,
    delete_passage,
)

router = APIRouter()

@router.post("/", response_model=PassageRead)
def create_passage_endpoint(
    passage: PassageCreate,
    session: Session = Depends(get_session),
):
    return create_passage(session, passage)

@router.get("/", response_model=List[PassageRead])
def read_passages(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
):
    passages = get_passages(session, skip=skip, limit=limit)
    return passages

@router.get("/{passage_id}", response_model=PassageReadExtended)
def read_passage(
    passage_id: int,
    session: Session = Depends(get_session),
):
    passage = get_passage_with_related(session, passage_id)
    if passage is None:
        raise HTTPException(status_code=404, detail="Passage not found")
    return passage

@router.delete("/{passage_id}")
def delete_passage_endpoint(
    passage_id: int,
    session: Session = Depends(get_session),
):
    if not delete_passage(session, passage_id):
        raise HTTPException(status_code=404, detail="Passage not found")
    return {"message": "Passage deleted successfully"}

# Growth Measurement endpoints
@router.post("/{passage_id}/measurements/", response_model=GrowthMeasurementRead)
def create_measurement(
    passage_id: int,
    measurement: GrowthMeasurementCreate,
    session: Session = Depends(get_session),
):
    # Verify passage exists
    passage = get_passage_with_related(session, passage_id)
    if passage is None:
        raise HTTPException(status_code=404, detail="Passage not found")
    if measurement.passage_id != passage_id:
        raise HTTPException(status_code=400, detail="Passage ID mismatch")
    return create_growth_measurement(session, measurement)

@router.get("/{passage_id}/measurements/", response_model=List[GrowthMeasurementRead])
def read_measurements(
    passage_id: int,
    session: Session = Depends(get_session),
):
    # Verify passage exists
    passage = get_passage_with_related(session, passage_id)
    if passage is None:
        raise HTTPException(status_code=404, detail="Passage not found")
    return get_passage_measurements(session, passage_id)

# Freeze Event endpoints
@router.post("/{passage_id}/freeze-events/", response_model=FreezeEventRead)
def create_freeze(
    passage_id: int,
    freeze_event: FreezeEventCreate,
    session: Session = Depends(get_session),
):
    # Verify passage exists
    passage = get_passage_with_related(session, passage_id)
    if passage is None:
        raise HTTPException(status_code=404, detail="Passage not found")
    if freeze_event.passage_id != passage_id:
        raise HTTPException(status_code=400, detail="Passage ID mismatch")
    return create_freeze_event(session, freeze_event)

@router.get("/{passage_id}/freeze-events/", response_model=List[FreezeEventRead])
def read_freeze_events(
    passage_id: int,
    session: Session = Depends(get_session),
):
    # Verify passage exists
    passage = get_passage_with_related(session, passage_id)
    if passage is None:
        raise HTTPException(status_code=404, detail="Passage not found")
    return get_passage_freeze_events(session, passage_id) 