import io
import csv
import json
from datetime import datetime
from typing import List, Iterator, Dict, Any, Set

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session

from ..database import get_session
# Assuming a standard FastAPI-Users dependency for the current user
# If this is incorrect, it needs adjustment based on the actual auth setup
# Remove the placeholder import
# from ..users import current_active_user # Placeholder import
# from ..models import CellState, UserRead # Assuming UserRead exists for type hint
from ..models import CellState # Keep CellState import
from ..crud import get_cell_states

router = APIRouter()

# Define a comprehensive list of all possible parameters
ALL_POSSIBLE_PARAMETERS = [
    # Basic parameters
    "temperature_c", "volume_ml", "location", "cell_density", "viability",
    "growth_rate", "doubling_time", "density_limit", "storage_location",
    
    # Operation-specific parameters
    "cell_type", "parent_end_density", "number_of_vials", "total_cells",
    "number_of_passages", "end_density", "distribution", "measured_value"
]

# Define all possible transition parameters
ALL_POSSIBLE_TRANSITION_PARAMETERS = [
    "operation_type", "cell_type", "parent_end_density", "number_of_vials", 
    "total_cells", "number_of_passages", "end_density", "distribution"
]

def format_value(value):
    """Helper to format values for CSV, handling dicts and datetimes."""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return json.dumps(value) # Serialize dicts to JSON strings
    if isinstance(value, (list, tuple)):
        return json.dumps(value) # Serialize lists to JSON strings
    if value is None:
        return ""
    return str(value)

def collect_all_parameter_keys(states: List[CellState], include_nested=True) -> Dict[str, Set[str]]:
    """
    Collects all parameter keys from all states, including nested parameters.
    
    Returns a dictionary with:
    - 'parameters': Set of all parameter keys from the parameters field
    - 'transition_parameters': Set of all parameter keys from transition_parameters if they exist
    """
    result = {
        'parameters': set(),
        'transition_parameters': set()
    }
    
    for state in states:
        # Extract parameters
        if isinstance(state.parameters, dict):
            # Add all parameters from this state (including custom ones)
            result['parameters'].update(state.parameters.keys())
            
            # Look for transition_parameters inside parameters
            if include_nested and 'transition_parameters' in state.parameters and isinstance(state.parameters['transition_parameters'], dict):
                result['transition_parameters'].update(state.parameters['transition_parameters'].keys())
    
    # Add all possible parameters we know about to ensure they're in the CSV headers
    # even if no state currently has them
    result['parameters'].update(ALL_POSSIBLE_PARAMETERS)
    result['transition_parameters'].update(ALL_POSSIBLE_TRANSITION_PARAMETERS)
    
    # Remove 'transition_parameters' from regular parameters if it exists
    # to avoid duplication, as we handle it separately
    if 'transition_parameters' in result['parameters']:
        result['parameters'].remove('transition_parameters')
    
    return result

def flatten_parameters(state: CellState) -> Dict[str, Any]:
    """
    Extracts all parameters from a state, including nested parameters,
    and flattens them into a single-level dictionary.
    """
    flat_data = {}
    
    # Add all regular parameters
    if isinstance(state.parameters, dict):
        for key, value in state.parameters.items():
            if key != 'transition_parameters':  # Handle transition_parameters separately
                flat_data[f"param_{key}"] = value
                
        # Handle transition_parameters if they exist
        if 'transition_parameters' in state.parameters and isinstance(state.parameters['transition_parameters'], dict):
            for key, value in state.parameters['transition_parameters'].items():
                flat_data[f"tp_{key}"] = value
    
    return flat_data

def generate_csv_rows(states: List[CellState]) -> Iterator[str]:
    """Generates CSV rows from CellState objects with all parameters flattened into individual columns."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Collect all parameter keys from all states
    all_keys = collect_all_parameter_keys(states)
    parameter_keys = sorted(all_keys['parameters'])
    transition_parameter_keys = sorted(all_keys['transition_parameters'])
    
    # Define headers - adding all parameter keys as individual columns
    base_headers = [
        "id", "name", "timestamp", "parent_id", 
        "transition_type", "additional_notes", "notes"
    ]
    
    # Add parameter keys and transition parameter keys as individual columns
    headers = base_headers + [f"param_{key}" for key in parameter_keys]
    headers += [f"tp_{key}" for key in transition_parameter_keys]
    
    writer.writerow(headers)
    yield output.getvalue() # Yield header row first
    output.seek(0)
    output.truncate(0)

    # Write data rows
    for state in states:
        # Base data
        row_data = {
            "id": state.id,
            "name": state.name,
            "timestamp": state.timestamp,
            "parent_id": state.parent_id,
            "transition_type": state.transition_type,
            "additional_notes": state.additional_notes,
            "notes": state.notes,
        }
        
        # Add flattened parameters
        flat_params = flatten_parameters(state)
        row_data.update(flat_params)
        
        # Build row in the correct order
        row = [format_value(row_data.get(h)) for h in headers]
        writer.writerow(row)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)


@router.get(
    "/export/csv",
    response_class=StreamingResponse,
    name="export:csv",
    # Add appropriate tags, summary, description
    tags=["Export"],
    summary="Export all cell state data as CSV",
    description="Downloads a CSV file containing all cell state records with all possible parameters flattened into columns.",
)
async def export_cell_states_csv(
    session: Session = Depends(get_session),
    # Remove the user dependency for now
    # user: UserRead = Depends(current_active_user), 
):
    """
    Fetches all cell state data and returns it as a streaming CSV file with all parameters expanded.
    Includes columns for all possible parameters, even if not present in any current state.
    """
    # Fetch all states. Using a large limit for simplicity.
    # A better approach for very large datasets might involve true streaming
    # from the DB or pagination within the generator.
    try:
        # Using a very large limit to fetch "all" states.
        # Consider potential memory issues if the dataset is huge.
        all_states = get_cell_states(session=session, limit=1000000) 
    except Exception as e:
        # Log the exception e
        raise HTTPException(status_code=500, detail="Could not fetch cell states from database.")

    if not all_states:
      # Return an empty CSV if no data exists, but still with all possible column headers
      def empty_generator():
          output = io.StringIO()
          writer = csv.writer(output)
          
          # Include headers for all possible parameters in empty CSV
          all_possible_params = collect_all_parameter_keys([])
          param_keys = sorted(all_possible_params['parameters'])
          tp_keys = sorted(all_possible_params['transition_parameters'])
          
          base_headers = [
              "id", "name", "timestamp", "parent_id", 
              "transition_type", "additional_notes", "notes"
          ]
          
          headers = base_headers + [f"param_{key}" for key in param_keys]
          headers += [f"tp_{key}" for key in tp_keys]
          
          writer.writerow(headers)
          yield output.getvalue() # Yield header row only
      
      filename = f"cell_culture_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
      headers = {'Content-Disposition': f'attachment; filename="{filename}"'}
      return StreamingResponse(
          empty_generator(),
          media_type="text/csv",
          headers=headers
      )

    filename = f"cell_culture_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    headers = {'Content-Disposition': f'attachment; filename="{filename}"'}

    return StreamingResponse(
        generate_csv_rows(all_states),
        media_type="text/csv",
        headers=headers,
    ) 