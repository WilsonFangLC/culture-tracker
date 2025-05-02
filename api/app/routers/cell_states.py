from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from ..database import get_session
from ..crud import delete_cell_state

router = APIRouter(
    prefix="/cell_states",
    tags=["Cell States"]
)

@router.delete("/{cell_state_id}", status_code=status.HTTP_204_NO_CONTENT)
async def handle_delete_cell_state(
    cell_state_id: int,
    session: Session = Depends(get_session),
):
    """Delete a cell state by its ID.

    Will return a 404 if the cell state does not exist.
    Will return a 409 if the cell state has children and cannot be deleted.
    Returns 204 No Content on successful deletion.
    """
    try:
        deleted = delete_cell_state(session=session, state_id=cell_state_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cell state not found."
            )
        # If delete_cell_state succeeded without raising an exception,
        # it means the state was found and had no children.
        # Return None (FastAPI handles the 204 status code)
        return None
    except HTTPException as e:
        # Re-raise the HTTPException from crud (e.g., the 409 Conflict)
        raise e
    except Exception as e:
        # Catch any other potential errors during deletion
        # Log the error e
        print(f"Error deleting cell state {cell_state_id}: {e}") # Basic logging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deleting the cell state."
        ) 