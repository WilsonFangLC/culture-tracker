from typing import Dict, List, Union, Optional

# Operation type definition
OperationType = str  # 'start_new_culture' | 'passage' | 'freeze' | 'thaw' | 'measurement' | 'split' | 'harvest'

# Define which parameters apply to which operation types
OPERATION_PARAMETER_MAPPING: Dict[str, List[str]] = {
    'start_new_culture': ['temperature_c', 'volume_ml', 'location', 'cell_density', 'start_viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'cell_type', 'operation_type'],
    'passage': ['temperature_c', 'volume_ml', 'location', 'cell_density', 'start_viability', 'parent_end_viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'parent_end_density', 'cell_type', 'example_parameter', 'operation_type'],
    'freeze': ['temperature_c', 'volume_ml', 'location', 'cell_density', 'parent_end_viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'parent_end_density', 'number_of_vials', 'total_cells', 'cell_type', 'operation_type'],
    'thaw': ['temperature_c', 'volume_ml', 'location', 'cell_density', 'start_viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'number_of_passages', 'cell_type', 'operation_type'],
    'measurement': ['temperature_c', 'volume_ml', 'location', 'cell_density', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'measured_value', 'cell_type', 'operation_type'],
    'split': ['temperature_c', 'volume_ml', 'location', 'cell_density', 'parent_end_viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'parent_end_density', 'cell_type', 'operation_type'],
    'harvest': ['temperature_c', 'volume_ml', 'location', 'parent_end_viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'end_density', 'cell_type', 'example_parameter', 'operation_type'],
}

# Define all possible parameters with metadata
ALL_PARAMETER_METADATA: Dict[str, Dict[str, Union[str, bool, List[str]]]] = {
    # Basic parameters that can apply to all nodes
    "example_parameter": {"displayName": "Example Parameter", "applicableToAllNodes": False, "operationSpecific": ['passage', 'harvest']},
    "temperature_c": {"displayName": "Temperature (°C)", "applicableToAllNodes": True},
    "volume_ml": {"displayName": "Volume (ml)", "applicableToAllNodes": True},
    "location": {"displayName": "Location", "applicableToAllNodes": True},
    "cell_density": {"displayName": "Initial Cell Density", "applicableToAllNodes": True},
    "start_viability": {"displayName": "Start Viability (%)", "applicableToAllNodes": False, "operationSpecific": ['start_new_culture', 'passage', 'thaw']},
    "parent_end_viability": {"displayName": "Parent End Viability (%)", "applicableToAllNodes": False, "operationSpecific": ['passage', 'harvest', 'freeze', 'split']},
    "growth_rate": {"displayName": "Hypothesized Growth Rate", "applicableToAllNodes": True},
    "doubling_time": {"displayName": "Hypothesized Doubling Time", "applicableToAllNodes": True},
    "density_limit": {"displayName": "Hypothesized Density Limit", "applicableToAllNodes": True},
    "measured_doubling_time": {"displayName": "Measured Doubling Time", "applicableToAllNodes": True},
    
    # Operation-specific parameters
    "cell_type": {"displayName": "Cell Type", "applicableToAllNodes": True, "operationSpecific": ['start_new_culture']},
    "parent_end_density": {"displayName": "Parent End Density", "applicableToAllNodes": False, "operationSpecific": ['passage', 'freeze', 'split']},
    "number_of_vials": {"displayName": "Number of Vials", "applicableToAllNodes": False, "operationSpecific": ['freeze']},
    "total_cells": {"displayName": "Total Cells", "applicableToAllNodes": False, "operationSpecific": ['freeze']},
    "number_of_passages": {"displayName": "Number of Passages", "applicableToAllNodes": False, "operationSpecific": ['thaw']},
    "end_density": {"displayName": "End Density", "applicableToAllNodes": False, "operationSpecific": ['harvest']},
    "measured_value": {"displayName": "Measured Value", "applicableToAllNodes": False, "operationSpecific": ['measurement']},
    
    # Former transition parameters, now regular parameters
    "operation_type": {"displayName": "Operation Type", "applicableToAllNodes": True},
}

# Get all possible parameter keys
ALL_POSSIBLE_PARAMETERS = list(ALL_PARAMETER_METADATA.keys())

def is_parameter_applicable(param_key: str, operation_type: Optional[str]) -> bool:
    """
    Determine if a parameter is applicable to a specific operation type.
    
    Args:
        param_key: The parameter key to check
        operation_type: The operation type, or None if not specified
        
    Returns:
        bool: True if the parameter is applicable, False otherwise
    """
    # If no operation type, only basic parameters apply
    if not operation_type:
        return ALL_PARAMETER_METADATA.get(param_key, {}).get("applicableToAllNodes", False)
    
    # Check if the parameter is in the list for this operation type
    applicable_params = OPERATION_PARAMETER_MAPPING.get(operation_type, [])
    return param_key in applicable_params 