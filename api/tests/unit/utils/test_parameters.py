import pytest
from typing import Optional
from app.utils.parameters import is_parameter_applicable, ALL_PARAMETER_METADATA, OPERATION_PARAMETER_MAPPING

# Test cases for is_parameter_applicable
# (param_key, operation_type, expected_result)
test_data = [
    # Case 1: Parameter applicable to all nodes, operation_type is None
    ("temperature_c", None, True),
    # Case 2: Parameter NOT applicable to all nodes, operation_type is None
    ("start_viability", None, False),
    # Case 3: Parameter specifically listed for an operation_type
    ("start_viability", "start_new_culture", True), # 'start_viability' is in 'start_new_culture'
    ("cell_density", "passage", True), # 'cell_density' is in 'passage'
    ("number_of_vials", "freeze", True), # 'number_of_vials' is in 'freeze'
    # Case 4: Parameter NOT listed for an operation_type
    ("number_of_vials", "passage", False), # 'number_of_vials' is not in 'passage'
    ("start_viability", "freeze", False), # 'start_viability' is not in 'freeze' (it's for start_new_culture, passage, thaw)
    # Case 5: param_key does not exist in ALL_PARAMETER_METADATA
    ("non_existent_param", None, False),
    ("non_existent_param", "passage", False),
    # Case 6: operation_type does not exist in OPERATION_PARAMETER_MAPPING
    ("temperature_c", "non_existent_operation", False), # Should return False as operation_type is unknown
    ("non_existent_param", "non_existent_operation", False), # Both non-existent
    # Additional checks based on function logic
    # Parameter is in ALL_PARAMETER_METADATA but not applicableToAllNodes, and not in specific op_type
    ("parent_end_density", "measurement", False), # parent_end_density is applicableToAllNodes:False, and not in 'measurement' list
    # Parameter is applicableToAllNodes:True, but also in a specific list (should still be true for that op_type)
    ("cell_type", "start_new_culture", True), # cell_type is applicableToAllNodes:True and also specifically listed for start_new_culture
]

@pytest.mark.parametrize("param_key, operation_type, expected", test_data)
def test_is_parameter_applicable(param_key: str, operation_type: Optional[str], expected: bool):
    """Test the is_parameter_applicable function with various scenarios."""
    # Print for easier debugging if a test fails
    # print(f"Testing with: param_key='{param_key}', operation_type='{operation_type}', expected={expected}")
    # print(f"Metadata for {param_key}: {ALL_PARAMETER_METADATA.get(param_key)}")
    # if operation_type:
    # print(f"Mapping for {operation_type}: {OPERATION_PARAMETER_MAPPING.get(operation_type)}")
    
    result = is_parameter_applicable(param_key, operation_type)
    assert result == expected

# Specific test for a known complex case: 'cell_type'
# 'cell_type' has "applicableToAllNodes": True, but also "operationSpecific": ['start_new_culture']
# The current logic for `is_parameter_applicable`:
# if not operation_type: return ALL_PARAMETER_METADATA.get(param_key, {}).get("applicableToAllNodes", False)
# else: return param_key in OPERATION_PARAMETER_MAPPING.get(operation_type, [])
# This means if an operation_type IS provided, it ONLY checks OPERATION_PARAMETER_MAPPING.
# This might be a subtle bug or intended behavior depending on requirements.
# Let's test the current behavior explicitly.

def test_is_parameter_applicable_cell_type_specific_ops():
    """Test 'cell_type' which is applicableToAllNodes=True.
    When an operation_type is provided, the function strictly checks OPERATION_PARAMETER_MAPPING.
    """
    # For 'start_new_culture', 'cell_type' is explicitly listed in OPERATION_PARAMETER_MAPPING, so True
    assert is_parameter_applicable("cell_type", "start_new_culture") == True
    
    # For 'passage', 'cell_type' IS explicitly listed in OPERATION_PARAMETER_MAPPING['passage'].
    # Even though "applicableToAllNodes": True for "cell_type" in metadata, the function's `else` branch is taken when op_type is specified.
    # `OPERATION_PARAMETER_MAPPING.get('passage', [])` contains 'cell_type'.
    # Therefore, this should be True.
    assert is_parameter_applicable("cell_type", "passage") == True
    
    # If no operation_type, it relies on applicableToAllNodes from metadata
    assert is_parameter_applicable("cell_type", None) == True


def test_all_params_in_metadata_are_in_some_mapping_or_global():
    """
    Check that every parameter in ALL_PARAMETER_METADATA is either:
    1. applicableToAllNodes: True
    OR
    2. Listed in at least one operation's list in OPERATION_PARAMETER_MAPPING if its operationSpecific is defined
    OR
    3. If applicableToAllNodes: False and no operationSpecific, this is a potential issue (orphaned).
       (Though current structure implies if not applicableToAllNodes, it SHOULD have operationSpecific)
    This test is more of a sanity check on the data consistency itself.
    """
    all_ops_with_params = set()
    for op_type, params in OPERATION_PARAMETER_MAPPING.items():
        for param in params:
            all_ops_with_params.add(param)

    issues = []
    for param_key, meta in ALL_PARAMETER_METADATA.items():
        is_global = meta.get("applicableToAllNodes", False)
        op_specific_list = meta.get("operationSpecific") # This could be a list or None

        if is_global:
            # If global, ensure it's available when op_type is None
            if not is_parameter_applicable(param_key, None):
                issues.append(f"'{param_key}' is applicableToAllNodes=True, but is_parameter_applicable returns False for op_type=None.")
            # Also, if global, it should be usable by ANY operation type not just by falling back to 'None' case.
            # The current `is_parameter_applicable` does NOT behave this way. If op_type is given, it strictly checks mapping.
            # This test will highlight this behavior for global params.
            for op_type_check in OPERATION_PARAMETER_MAPPING.keys():
                if param_key not in OPERATION_PARAMETER_MAPPING.get(op_type_check, []):
                    # This means a global param is NOT in a specific op_type's list
                    # According to is_parameter_applicable, it would return False for this op_type
                    if is_parameter_applicable(param_key, op_type_check):
                        issues.append(f"'{param_key}' is global and NOT in '{op_type_check}' mapping, but is_parameter_applicable returned True (unexpected for current logic). Should be False.")
                    # The more intuitive expectation for a global param might be True here.
                    # We are testing the *current* function's behavior.
        
        elif op_specific_list: # Not global, but has an operationSpecific list in metadata
            # It should be in OPERATION_PARAMETER_MAPPING for those specific operations
            for op in op_specific_list:
                if op not in OPERATION_PARAMETER_MAPPING or param_key not in OPERATION_PARAMETER_MAPPING[op]:
                    issues.append(f"'{param_key}' lists '{op}' in its metadata.operationSpecific, but not found in OPERATION_PARAMETER_MAPPING['{op}'].")
            # And it should NOT be applicable if operation_type is None
            if is_parameter_applicable(param_key, None):
                issues.append(f"'{param_key}' is not applicableToAllNodes, but is_parameter_applicable returns True for op_type=None.")
        
        # This case implies param is not global and has no specific operations in its own metadata.
        # Such params would only be active if directly listed in OPERATION_PARAMETER_MAPPING.
        # This is covered by checking if it's in all_ops_with_params if not global.
        elif not is_global and not op_specific_list:
             if param_key not in all_ops_with_params:
                issues.append(f"'{param_key}' is not global, has no operationSpecific metadata, and not found in any OPERATION_PARAMETER_MAPPING lists (orphaned or implicitly global via direct mapping inclusion?).")


    assert not issues, "\n" + "\n".join(issues) 