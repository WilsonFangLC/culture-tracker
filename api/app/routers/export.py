import io
import csv
import json
from datetime import datetime
from typing import List, Iterator

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

def format_value(value):
    """Helper to format values for CSV, handling dicts and datetimes."""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return json.dumps(value) # Serialize dicts to JSON strings
    if value is None:
        return ""
    return str(value)

def generate_csv_rows(states: List[CellState]) -> Iterator[str]:
    """Generates CSV rows from CellState objects."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Define headers - ensuring order and including all relevant fields
    headers = [
        "id", "name", "timestamp", "parent_id", "parameters",
        "notes", "transition_type", "additional_notes"
    ]
    writer.writerow(headers)
    yield output.getvalue() # Yield header row first
    output.seek(0)
    output.truncate(0)

    # Write data rows
    for state in states:
        row = [
            format_value(getattr(state, h, None)) for h in headers
        ]
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
    description="Downloads a CSV file containing all cell state records.",
)
async def export_cell_states_csv(
    session: Session = Depends(get_session),
    # Remove the user dependency for now
    # user: UserRead = Depends(current_active_user), 
):
    """
    Fetches all cell state data and returns it as a streaming CSV file.
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
      # Return an empty CSV if no data exists
      def empty_generator():
          output = io.StringIO()
          writer = csv.writer(output)
          headers = [
              "id", "name", "timestamp", "parent_id", "parameters",
              "notes", "transition_type", "additional_notes"
          ]
          writer.writerow(headers)
          yield output.getvalue() # Yield header row first
      
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