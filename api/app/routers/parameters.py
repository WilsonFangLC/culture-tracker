from fastapi import APIRouter
from ..utils.parameters import (
    OPERATION_PARAMETER_MAPPING,
    ALL_PARAMETER_METADATA,
    ALL_POSSIBLE_PARAMETERS
)

router = APIRouter()

@router.get(
    "/parameters/definitions",
    name="parameters:get_definitions",
    tags=["Parameters"],
    summary="Get parameter definitions",
    description="Returns all parameter metadata and mappings to operation types."
)
async def get_parameter_definitions():
    """
    Get parameter definitions.
    
    Returns:
        dict: Parameter metadata and mappings
    """
    return {
        "operation_parameter_mapping": OPERATION_PARAMETER_MAPPING,
        "parameter_metadata": ALL_PARAMETER_METADATA,
        "all_possible_parameters": ALL_POSSIBLE_PARAMETERS
    } 