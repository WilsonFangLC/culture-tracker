import io
import csv
import json
from datetime import datetime
from typing import List, Iterator, Dict, Any, Set, Union, Optional
import logging

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
# Import the centralized parameter definitions
from ..utils.parameters import (
    OperationType,
    OPERATION_PARAMETER_MAPPING,
    ALL_PARAMETER_METADATA,
    ALL_POSSIBLE_PARAMETERS,
    is_parameter_applicable
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Remove duplicate definitions
# Define operation types
# OperationType = str  # 'start_new_culture' | 'passage' | 'freeze' | 'thaw' | 'measurement' | 'split' | 'harvest'

# Define which parameters apply to which operation types
# OPERATION_PARAMETER_MAPPING: Dict[str, List[str]] = { ... }

# Define all possible parameters with metadata
# ALL_PARAMETER_METADATA: Dict[str, Dict[str, Union[str, bool, List[str]]]] = { ... }

# Get all possible parameter keys
# ALL_POSSIBLE_PARAMETERS = list(ALL_PARAMETER_METADATA.keys())

# Remove this function as it's now imported
# def is_parameter_applicable(param_key: str, operation_type: Optional[str]) -> bool:
#    """
#    Determine if a parameter is applicable to a specific operation type.
#    ...
#    """
#    if not operation_type:
#        return ALL_PARAMETER_METADATA.get(param_key, {}).get("applicableToAllNodes", False)
#    
#    applicable_params = OPERATION_PARAMETER_MAPPING.get(operation_type, [])
#    return param_key in applicable_params

def format_value(value, param_key: str = None, operation_type: Optional[str] = None) -> str:
    """
    Helper to format values for CSV, handling dicts, datetimes, and NA values.
    
    Args:
        value: The value to format
        param_key: The parameter key (optional, for determining applicability)
        operation_type: The operation type (optional, for determining applicability)
    
    Returns:
        str: The formatted value
    """
    # If param_key is provided, check if it's applicable to this operation type
    if param_key and operation_type is not None:
        if not is_parameter_applicable(param_key, operation_type):
            return "N/A"  # Parameter is not applicable to this operation type
    
    # Format the value
    if value is None:
        return ""  # Optional parameter not provided
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return json.dumps(value)  # Serialize dicts to JSON strings
    if isinstance(value, (list, tuple)):
        return json.dumps(value)  # Serialize lists to JSON strings
    
    return str(value)

def collect_all_parameter_keys(states: List[CellState], include_nested=True) -> Set[str]:
    """
    Collects all parameter keys from all states, including nested parameters.
    
    Returns a set of all parameter keys
    """
    result = set()
    
    for state in states:
        # Extract parameters
        if isinstance(state.parameters, dict):
            # Add all parameters from this state (including custom ones)
            result.update(state.parameters.keys())
            
            # Look for transition_parameters inside parameters
            if include_nested and 'transition_parameters' in state.parameters and isinstance(state.parameters['transition_parameters'], dict):
                result.update(state.parameters['transition_parameters'].keys())
    
    # Add all possible parameters we know about to ensure they're in the CSV headers
    # even if no state currently has them
    result.update(ALL_POSSIBLE_PARAMETERS)
    
    # Remove 'transition_parameters' from regular parameters if it exists
    # to avoid duplication, as we handle it separately
    if 'transition_parameters' in result:
        result.remove('transition_parameters')
    
    return result

def flatten_parameters(state: CellState) -> Dict[str, Any]:
    """
    Extracts all parameters from a state, including nested parameters,
    and flattens them into a single-level dictionary.
    """
    flat_data = {}
    
    # Get the operation type for applicability checks
    operation_type = None
    cell_type = None
    if isinstance(state.parameters, dict) and 'transition_parameters' in state.parameters:
        operation_type = state.parameters['transition_parameters'].get('operation_type')
        # Get cell_type from transition parameters if available
        cell_type = state.parameters['transition_parameters'].get('cell_type')
    
    # Add all regular parameters
    if isinstance(state.parameters, dict):
        for key, value in state.parameters.items():
            if key != 'transition_parameters':  # Handle transition_parameters separately
                # For cell_type, check if it exists in transition_parameters and use that if main param is empty
                if key == 'cell_type' and (value is None or value == '') and cell_type:
                    value = cell_type
                
                flat_data[key] = {
                    'value': value,
                    'is_applicable': is_parameter_applicable(key, operation_type)
                }
                
        # Handle transition_parameters if they exist
        if 'transition_parameters' in state.parameters and isinstance(state.parameters['transition_parameters'], dict):
            for key, value in state.parameters['transition_parameters'].items():
                # Don't overwrite existing params unless the value is empty or null
                if key not in flat_data or flat_data[key]['value'] is None or flat_data[key]['value'] == '':
                    # Operation type is always applicable
                    is_app = True
                    if key == 'operation_type':
                        is_app = True
                    else:
                        is_app = is_parameter_applicable(key, operation_type)
                    
                    flat_data[key] = {
                        'value': value,
                        'is_applicable': is_app
                    }
        
        # Ensure cell_type is included in the main parameters if it doesn't exist but exists in transition_parameters
        if 'cell_type' not in flat_data and cell_type:
            flat_data["cell_type"] = {
                'value': cell_type,
                'is_applicable': is_parameter_applicable('cell_type', operation_type)
            }
    
    return flat_data

def generate_csv_rows(states: List[CellState]) -> Iterator[str]:
    """Generates CSV rows from CellState objects with all parameters flattened into individual columns."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Collect all parameter keys from all states
    all_parameter_keys = sorted(collect_all_parameter_keys(states))
    
    # Original data keys (for data processing)
    base_header_keys = [
        "id", "name", "timestamp", "parent_id", 
        "transition_type", "additional_notes", "notes"
    ]
    original_headers = base_header_keys + all_parameter_keys
    
    # Define base headers with proper display names
    base_headers = [
        "ID", "Name (global)", "Timestamp (global)", "Parent ID (global)", 
        "Transition Type (global)", "Additional Notes (global)", "Notes (global)"
    ]
    
    # Add parameter keys with proper display names and applicability information
    param_headers = []
    for key in all_parameter_keys:
        metadata = ALL_PARAMETER_METADATA.get(key, {})
        display_name = metadata.get("displayName", key)
        
        # Check if it's applicable to all nodes or operation-specific
        if metadata.get("applicableToAllNodes", False):
            param_headers.append(f"{display_name} (global)")
        elif "operationSpecific" in metadata:
            op_specific = ", ".join(metadata.get("operationSpecific", []))
            param_headers.append(f"{display_name} ({op_specific} specific)")
        else:
            param_headers.append(f"{display_name}")
    
    # Combine all headers
    display_headers = base_headers + param_headers
    
    # Add a legend row explaining NA and empty values
    legend_row = ["LEGEND:"] + ["" for _ in range(len(display_headers) - 1)]
    writer.writerow(legend_row)
    
    legend_explanation = ["'N/A' = Parameter not applicable to this operation type", 
                          "'empty' = Optional parameter not provided"]
    for explanation in legend_explanation:
        explanation_row = [explanation] + ["" for _ in range(len(display_headers) - 1)]
        writer.writerow(explanation_row)
    
    # Add a blank row before the actual headers
    writer.writerow(["" for _ in range(len(display_headers))])
    
    # Write the actual headers
    writer.writerow(display_headers)
    yield output.getvalue()  # Yield legend and header rows
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
        
        # Get operation type for parameter applicability checks
        operation_type = None
        if isinstance(state.parameters, dict) and 'transition_parameters' in state.parameters:
            operation_type = state.parameters['transition_parameters'].get('operation_type')
        
        # Add flattened parameters
        flat_params = flatten_parameters(state)
        
        # Build row in the correct order with proper formatting
        row = []
        for header_key in original_headers:
            if header_key in row_data:
                # Basic fields
                row.append(format_value(row_data[header_key]))
            elif header_key in flat_params:
                # Parameters
                param_data = flat_params[header_key]
                row.append(format_value(
                    param_data['value'], 
                    header_key, 
                    operation_type if param_data['is_applicable'] else None
                ))
            else:
                # Check if the parameter is applicable
                if is_parameter_applicable(header_key, operation_type):
                    row.append("")  # Empty but applicable
                else:
                    row.append("N/A")  # Not applicable
        
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
    print("=== EXPORT CSV: Function entered ===", flush=True)
    logger.error("=== EXPORT CSV: Function entered (ERROR LEVEL) ===")
    logger.info("=== EXPORT CSV: Function entered (INFO LEVEL) ===")
    """
    Fetches all cell state data and returns it as a streaming CSV file with all parameters expanded.
    Includes columns for all possible parameters, even if not present in any current state.
    Distinguishes between 'N/A' (not applicable to operation type) and empty (optional parameter not provided).
    """
    # Fetch all states. Using a large limit for simplicity.
    # A better approach for very large datasets might involve true streaming
    # from the DB or pagination within the generator.
    try:
        print("=== EXPORT CSV: Attempting to fetch states ===", flush=True)
        # Using a very large limit to fetch "all" states.
        # Consider potential memory issues if the dataset is huge.
        all_states = get_cell_states(session=session, limit=1000000) 
        print(f"=== EXPORT CSV: Fetched {len(all_states)} states ===", flush=True)
    except Exception as e:
        # Log the exception e
        print(f"=== EXPORT CSV ERROR: {str(e)} ===", flush=True)
        logger.error(f"=== EXPORT CSV ERROR: {str(e)} ===")
        raise HTTPException(status_code=500, detail=f"Could not fetch cell states from database: {str(e)}")

    if not all_states:
      print("=== EXPORT CSV: No states found, returning empty CSV ===", flush=True)
      # Return an empty CSV if no data exists, but still with all possible column headers
      def empty_generator():
          output = io.StringIO()
          writer = csv.writer(output)
          
          # Include headers for all possible parameters in empty CSV
          all_possible_params = collect_all_parameter_keys([])
          param_keys = sorted(all_possible_params)
          
          # Define base headers with proper display names
          base_headers = [
              "ID", "Name (global)", "Timestamp (global)", "Parent ID (global)", 
              "Transition Type (global)", "Additional Notes (global)", "Notes (global)"
          ]
          
          # Add parameter keys with proper display names and applicability information
          param_headers = []
          for key in param_keys:
              metadata = ALL_PARAMETER_METADATA.get(key, {})
              display_name = metadata.get("displayName", key)
              
              # Check if it's applicable to all nodes or operation-specific
              if metadata.get("applicableToAllNodes", False):
                  param_headers.append(f"{display_name} (global)")
              elif "operationSpecific" in metadata:
                  op_specific = ", ".join(metadata.get("operationSpecific", []))
                  param_headers.append(f"{display_name} ({op_specific} specific)")
              else:
                  param_headers.append(f"{display_name}")
          
          # Combine all headers
          display_headers = base_headers + param_headers
          
          # Add a legend row explaining NA and empty values
          legend_row = ["LEGEND:"] + ["" for _ in range(len(display_headers) - 1)]
          writer.writerow(legend_row)
          
          legend_explanation = ["'N/A' = Parameter not applicable to this operation type", 
                              "'empty' = Optional parameter not provided"]
          for explanation in legend_explanation:
              explanation_row = [explanation] + ["" for _ in range(len(display_headers) - 1)]
              writer.writerow(explanation_row)
          
          # Add a blank row before the actual headers
          writer.writerow(["" for _ in range(len(display_headers))])
          
          # Write the actual headers
          writer.writerow(display_headers)
          yield output.getvalue() # Yield header row only
      
      filename = f"cell_culture_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
      headers = {'Content-Disposition': f'attachment; filename="{filename}"'}
      return StreamingResponse(
          empty_generator(),
          media_type="text/csv",
          headers=headers
      )

    print("=== EXPORT CSV: Creating full CSV with data ===", flush=True)
    filename = f"cell_culture_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    headers = {'Content-Disposition': f'attachment; filename="{filename}"'}

    return StreamingResponse(
        generate_csv_rows(all_states),
        media_type="text/csv",
        headers=headers,
    ) 