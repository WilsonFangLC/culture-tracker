from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session
from pydantic import BaseModel
from datetime import datetime

from ..database import get_session
from ..models import CellState
from ..crud import get_cell_state_by_id
from ..calcs import calculate_measured_parameters

router = APIRouter()

class MeasuredParametersRequest(BaseModel):
    start_state_id: int
    end_state_id: int

class MeasuredParametersResponse(BaseModel):
    measured_growth_rate: Optional[float]
    measured_doubling_time: Optional[float]
    measured_density_limit: Optional[float]
    start_state_id: int
    end_state_id: int
    start_density: Optional[float]
    end_density: Optional[float]
    time_elapsed_hours: Optional[float]
    success: bool
    message: str

@router.post("/calculate-measured-parameters", response_model=MeasuredParametersResponse)
def calc_measured_parameters(
    request: MeasuredParametersRequest = Body(...),
    session: Session = Depends(get_session)
) -> MeasuredParametersResponse:
    """
    Calculate measured growth parameters (growth rate, doubling time, density limit)
    based on the actual observed growth between two states.
    """
    # Get the start and end states
    start_state = get_cell_state_by_id(session, request.start_state_id)
    end_state = get_cell_state_by_id(session, request.end_state_id)
    
    # Check if both states exist
    if not start_state:
        return MeasuredParametersResponse(
            measured_growth_rate=None,
            measured_doubling_time=None,
            measured_density_limit=None,
            start_state_id=request.start_state_id,
            end_state_id=request.end_state_id,
            start_density=None,
            end_density=None,
            time_elapsed_hours=None,
            success=False,
            message="Start state not found"
        )
    
    if not end_state:
        return MeasuredParametersResponse(
            measured_growth_rate=None,
            measured_doubling_time=None,
            measured_density_limit=None,
            start_state_id=request.start_state_id,
            end_state_id=request.end_state_id,
            start_density=None,
            end_density=None,
            time_elapsed_hours=None,
            success=False,
            message="End state not found"
        )
    
    # Extract cell densities
    start_density = start_state.parameters.get("cell_density")
    end_density = end_state.parameters.get("cell_density")
    
    # Check for valid density values
    if not isinstance(start_density, (int, float)) or start_density <= 0:
        return MeasuredParametersResponse(
            measured_growth_rate=None,
            measured_doubling_time=None,
            measured_density_limit=None,
            start_state_id=request.start_state_id,
            end_state_id=request.end_state_id,
            start_density=start_density,
            end_density=end_density,
            time_elapsed_hours=None,
            success=False,
            message="Invalid or missing start density"
        )
    
    if not isinstance(end_density, (int, float)) or end_density <= 0:
        return MeasuredParametersResponse(
            measured_growth_rate=None,
            measured_doubling_time=None,
            measured_density_limit=None,
            start_state_id=request.start_state_id,
            end_state_id=request.end_state_id,
            start_density=start_density,
            end_density=end_density,
            time_elapsed_hours=None,
            success=False,
            message="Invalid or missing end density"
        )
    
    # Parse timestamps
    try:
        start_time = start_state.timestamp
        end_time = end_state.timestamp
        
        # Calculate time difference
        start_dt = datetime.fromisoformat(str(start_time))
        end_dt = datetime.fromisoformat(str(end_time))
        
        # Ensure end time is after start time
        if end_dt <= start_dt:
            return MeasuredParametersResponse(
                measured_growth_rate=None,
                measured_doubling_time=None,
                measured_density_limit=None,
                start_state_id=request.start_state_id,
                end_state_id=request.end_state_id,
                start_density=start_density,
                end_density=end_density,
                time_elapsed_hours=None,
                success=False,
                message="End time must be after start time"
            )
        
        # Calculate time elapsed in hours
        time_elapsed_hours = (end_dt - start_dt).total_seconds() / 3600.0
        
        # Calculate measured parameters
        result = calculate_measured_parameters(
            start_density=start_density,
            end_density=end_density,
            start_time=str(start_time),
            end_time=str(end_time)
        )
        
        # Update the end state with the measured parameters
        end_state.parameters.update(result)
        session.commit()
        
        return MeasuredParametersResponse(
            measured_growth_rate=result["measured_growth_rate"],
            measured_doubling_time=result["measured_doubling_time"],
            measured_density_limit=result["measured_density_limit"],
            start_state_id=request.start_state_id,
            end_state_id=request.end_state_id,
            start_density=start_density,
            end_density=end_density,
            time_elapsed_hours=time_elapsed_hours,
            success=True,
            message="Measured parameters calculated successfully"
        )
    
    except Exception as e:
        return MeasuredParametersResponse(
            measured_growth_rate=None,
            measured_doubling_time=None,
            measured_density_limit=None,
            start_state_id=request.start_state_id,
            end_state_id=request.end_state_id,
            start_density=start_density,
            end_density=end_density,
            time_elapsed_hours=None,
            success=False,
            message=f"Error calculating parameters: {str(e)}"
        ) 