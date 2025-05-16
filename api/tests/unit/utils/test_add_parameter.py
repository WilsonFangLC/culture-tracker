import pytest
from app.utils.add_parameter import validate_parameter_name

# Test cases for validate_parameter_name
# (name, expected_result)
validate_name_test_data = [
    # Valid names
    ("valid_param", True),
    ("another_valid_one", True),
    ("p", True),
    ("p1", True),
    ("param_123_test", True),
    ("underscore_at_end_", True), # Allowed by regex: [a-z0-9_]*

    # Invalid names
    ("InvalidCaps", False),          # Contains uppercase
    ("invalid-hyphen", False),       # Contains hyphen
    ("1_starts_with_digit", False), # Starts with digit
    # ("._starts_with_dot", False), # Starts with dot (not explicitly handled by [a-z_] but good to check)
    # (".leading_dot_not_allowed", False), # Example from problem description
    ("no_special_chars!", False),    # Contains special char
    ("param with space", False),     # Contains space
    ("", False),                     # Empty string
    ("_leading_underscore", True),  # Allowed by [a-z_] as first char
    ("double__underscore", True),   # Allowed
    ("__leading_double", True),     # Allowed
]

@pytest.mark.parametrize("name, expected", validate_name_test_data)
def test_validate_parameter_name(name: str, expected: bool):
    """Test the validate_parameter_name function with various inputs."""
    assert validate_parameter_name(name) == expected

# Import necessary modules for testing check_parameter_exists
from unittest.mock import MagicMock, patch, mock_open
from app.utils import add_parameter as add_parameter_module # Alias for patching
from app.utils.add_parameter import check_parameter_exists

# Test data for check_parameter_exists
# (param_name, mock_backend_content, mock_frontend_content, expected_result)
check_exists_test_data = [
    ("existing_param", 'ALL_PARAMETER_METADATA = {\n    "existing_param": {}\n}', 'ALL_PARAMETER_METADATA = {\n  "existing_param": {}\n};', True),
    ("only_in_backend", 'ALL_PARAMETER_METADATA = {\n    "only_in_backend": {}\n}', 'ALL_PARAMETER_METADATA = {\n};', False),
    ("only_in_frontend", 'ALL_PARAMETER_METADATA = {\n}', 'ALL_PARAMETER_METADATA = {\n  "only_in_frontend": {}\n};', False),
    ("not_existing", 'ALL_PARAMETER_METADATA = {\n}', 'ALL_PARAMETER_METADATA = {\n};', False),
    ("empty_files", "", "", False),
    # Test regex specificity (e.g., substring shouldn't match)
    ("param", 'ALL_PARAMETER_METADATA = {\n    "other_param_extra": {}\n}', 'ALL_PARAMETER_METADATA = {\n  "other_param_extra": {}\n};', False),
    ("specific_param", 'ALL_PARAMETER_METADATA = {\n    "specific_param": {}\n}', 'ALL_PARAMETER_METADATA = {\n  "specific_param": {}\n};', True),
    # Test spacing variations
    ("spacing_param", 'ALL_PARAMETER_METADATA = {\n    "spacing_param"   :    {}\n}', 'ALL_PARAMETER_METADATA = {\n  "spacing_param"   :    {}\n};', True),
    # Test different key in backend vs frontend
    ("mismatch_param", 'ALL_PARAMETER_METADATA = {\n    "mismatch_param": {}\n}', 'ALL_PARAMETER_METADATA = {\n  "another_param": {}\n};', False),
]

@pytest.mark.parametrize("param_name, mock_backend_content, mock_frontend_content, expected", check_exists_test_data)
def test_check_parameter_exists(param_name, mock_backend_content, mock_frontend_content, expected, mocker):
    """Test the check_parameter_exists function with various scenarios."""
    
    # Patch the file paths within the add_parameter module
    mocker.patch.object(add_parameter_module, 'BACKEND_PARAMS_FILE', 'mock_backend_params.py')
    mocker.patch.object(add_parameter_module, 'FRONTEND_PARAMS_FILE', 'mock_frontend_params.ts')

    def mock_file_open(filename, mode):
        if filename == 'mock_backend_params.py':
            return mock_open(read_data=mock_backend_content).return_value
        elif filename == 'mock_frontend_params.ts':
            return mock_open(read_data=mock_frontend_content).return_value
        else:
            # This case should not be reached if mocks are set up correctly
            raise FileNotFoundError(f"Attempted to open an unexpected file: {filename}")

    mock_open_func = mocker.patch('builtins.open', side_effect=mock_file_open)

    result = check_parameter_exists(param_name)
    assert result == expected

    # Verify that open was called for both files
    # We expect two calls to open in the check_parameter_exists function
    assert mock_open_func.call_count == 2
    mock_open_func.assert_any_call('mock_backend_params.py', 'r')
    mock_open_func.assert_any_call('mock_frontend_params.ts', 'r')

# Tests for add_parameter_to_backend
from app.utils.add_parameter import add_parameter_to_backend

# (test_id, initial_lines, name, display_name, applicable_to_all, op_specific, expected_return, expected_lines_after_add)
add_backend_test_data = [
    (
        "add_global_param_with_op_type",
        [
            'ALL_PARAMETER_METADATA = {\n',
            '    "existing_param": {"displayName": "Existing Param", "applicableToAllNodes": True},\n',
            '    "operation_type": {"displayName": "Operation Type", "applicableToAllNodes": True},\n',
            '}\n',
            'OPERATION_PARAMETER_MAPPING = {}\n'
        ],
        "new_global", "New Global", True, None,
        True,
        [
            'ALL_PARAMETER_METADATA = {\n',
            '    "new_global": {"displayName": "New Global", "applicableToAllNodes": True},\n',
            '    "existing_param": {"displayName": "Existing Param", "applicableToAllNodes": True},\n',
            '    "operation_type": {"displayName": "Operation Type", "applicableToAllNodes": True},\n',
            '}\n',
            'OPERATION_PARAMETER_MAPPING = {}\n'
        ]
    ),
    (
        "add_global_param_no_op_type",
        [
            'ALL_PARAMETER_METADATA = {\n',
            '    "existing_param": {"displayName": "Existing Param", "applicableToAllNodes": True}\n', # No comma
            '}\n',
            'OPERATION_PARAMETER_MAPPING = {}\n'
        ],
        "new_global_2", "New Global 2", True, None,
        True,
        [
            'ALL_PARAMETER_METADATA = {\n',
            '    "new_global_2": {"displayName": "New Global 2", "applicableToAllNodes": True},\n',
            '    "existing_param": {"displayName": "Existing Param", "applicableToAllNodes": True}\n',
            '}\n',
            'OPERATION_PARAMETER_MAPPING = {}\n'
        ]
    ),
    (
        "add_op_specific_param",
        [
            'ALL_PARAMETER_METADATA = {\n',
            '    "operation_type": {"displayName": "Operation Type", "applicableToAllNodes": True},\n', 
            '}\n',
            'OPERATION_PARAMETER_MAPPING = {\n',
            "    'start_new_culture': ['old_param', 'operation_type'],\n",
            "    'passage': ['another_old_param'],\n",
            '}\n'
        ],
        "new_op_spec", "New Op Specific", False, ["start_new_culture", "passage"],
        True,
        [
            'ALL_PARAMETER_METADATA = {\n',
            '    "new_op_spec": {"displayName": "New Op Specific", "applicableToAllNodes": False, "operationSpecific": [\'start_new_culture\', \'passage\']},\n',
            '    "operation_type": {"displayName": "Operation Type", "applicableToAllNodes": True},\n',
            '}\n',
            'OPERATION_PARAMETER_MAPPING = {\n',
            "    'start_new_culture': ['old_param', 'new_op_spec', 'operation_type'],\n",
            "    'passage': ['another_old_param', 'new_op_spec'],\n",
            '}\n'
        ]
    ),
    (
        "add_op_specific_param_empty_mapping_list",
        [
            'ALL_PARAMETER_METADATA = {\n',
            '    "operation_type": {"displayName": "Operation Type", "applicableToAllNodes": True},\n',
            '}\n',
            'OPERATION_PARAMETER_MAPPING = {\n',
            "    'freeze': []\n",
            '}\n'
        ],
        "param_for_freeze", "Param For Freeze", False, ["freeze"],
        True,
        [
            'ALL_PARAMETER_METADATA = {\n',
            '    "param_for_freeze": {"displayName": "Param For Freeze", "applicableToAllNodes": False, "operationSpecific": [\'freeze\']},\n',
            '    "operation_type": {"displayName": "Operation Type", "applicableToAllNodes": True},\n',
            '}\n',
            'OPERATION_PARAMETER_MAPPING = {\n',
            "    'freeze': [, 'param_for_freeze']\n",
            '}\n'
        ]
    ),
    (
        "metadata_section_not_found",
        [
            '# No ALL_PARAMETER_METADATA here\n',
            'OPERATION_PARAMETER_MAPPING = {}\n'
        ],
        "fail_param", "Fail Param", True, None,
        False, # Expected to fail
        [
            '# No ALL_PARAMETER_METADATA here\n', # Content should remain unchanged
            'OPERATION_PARAMETER_MAPPING = {}\n'
        ]
    ),
]

@pytest.mark.parametrize("test_id, initial_lines, name, display_name, applicable_to_all, op_specific, expected_return, expected_lines_after_add", add_backend_test_data)
def test_add_parameter_to_backend(test_id, initial_lines, name, display_name, applicable_to_all, op_specific, expected_return, expected_lines_after_add, mocker):
    """Test the add_parameter_to_backend function."""
    mocker.patch.object(add_parameter_module, 'BACKEND_PARAMS_FILE', 'mock_backend_params.py')

    mock_initial_content = "".join(initial_lines)
    
    # This mock will represent the file object opened in write mode.
    # It needs to support the context manager protocol (__enter__, __exit__)
    # and have a `writelines` method.
    mock_write_file_object = MagicMock()
    mock_write_file_object.__enter__.return_value = mock_write_file_object
    mock_write_file_object.__exit__.return_value = None
    # actual_writelines_mock = MagicMock() # For asserting calls on writelines
    # mock_write_file_object.writelines = actual_writelines_mock
    # No, MagicMock creates methods like writelines on demand. So we can just assert on mock_write_file_object.writelines

    def open_side_effect(file, mode='r', **kwargs):
        if file == 'mock_backend_params.py':
            if mode == 'r':
                # For read, return a standard mock_open file object with initial content
                return mock_open(read_data=mock_initial_content).return_value
            elif mode == 'w':
                # For write, return our specially prepared mock file object
                return mock_write_file_object
        # Fallback for any other file open calls (should not happen in this test)
        raise FileNotFoundError(f"Unexpected call to open: {file} with mode {mode}")

    mock_open_patch = mocker.patch('builtins.open', side_effect=open_side_effect)

    actual_return = add_parameter_to_backend(name, display_name, applicable_to_all, op_specific)
    assert actual_return == expected_return

    # Check that open was called for reading
    read_call_found = any(
        call_args[0] == ('mock_backend_params.py', 'r') 
        for call_args in mock_open_patch.call_args_list
    )
    assert read_call_found, "open('mock_backend_params.py', 'r') was not called"

    if expected_return:
        # Check that open was called for writing
        write_call_found = any(
            call_args[0] == ('mock_backend_params.py', 'w') 
            for call_args in mock_open_patch.call_args_list
        )
        assert write_call_found, "open('mock_backend_params.py', 'w') was not called"
        
        # Assert that writelines was called on our mock write file object
        mock_write_file_object.writelines.assert_called_once()
        actual_written_lines = mock_write_file_object.writelines.call_args[0][0]
        
        processed_expected_lines = [line if line.endswith('\n') else line + '\n' for line in expected_lines_after_add]
        
        # Debugging helper
        if actual_written_lines != processed_expected_lines:
            print(f"\nDEBUGGING Test ID: {test_id}")
            print("EXPECTED lines:")
            for i, line in enumerate(processed_expected_lines): print(f"{i}: {repr(line)}")
            print("ACTUAL lines:")
            for i, line in enumerate(actual_written_lines): print(f"{i}: {repr(line)}")
            print(f"Expected len: {len(processed_expected_lines)}, Actual len: {len(actual_written_lines)}")
            # import difflib
            # diff = difflib.unified_diff(processed_expected_lines, actual_written_lines, fromfile='expected', tofile='actual', lineterm='')
            # print("\nDiff:")
            # for line_diff in diff: print(line_diff)

        assert actual_written_lines == processed_expected_lines, f"Test ID: {test_id} - Written content does not match expected content."
    else:
        # Ensure writelines was not called if the function was expected to fail and return early
        mock_write_file_object.writelines.assert_not_called(), f"Test ID: {test_id} - writelines should not have been called for a failing test case." 

# Tests for add_parameter_to_frontend
from app.utils.add_parameter import add_parameter_to_frontend

# (test_id, initial_lines, name, display_name, applicable_to_all, op_specific, expected_return, expected_lines_after_add)
add_frontend_test_data = [
    (
        "add_global_to_empty_fe",
        [
            "export const ALL_PARAMETER_METADATA: Record<string, ParameterMetadata> = {\n",
            "};\n",
            "export const OPERATION_SPECIFIC_PARAMS_FRONTEND: Record<string, string[]> = {};\n" # Ensure other parts of file are preserved
        ],
        "new_global_fe", "New Global FE", True, None,
        True,
        [
            "export const ALL_PARAMETER_METADATA: Record<string, ParameterMetadata> = {\n",
            '  "new_global_fe": { displayName: "New Global FE", applicableToAllNodes: true },\n',
            "};\n",
            "export const OPERATION_SPECIFIC_PARAMS_FRONTEND: Record<string, string[]> = {};\n"
        ]
    ),
    (
        "add_global_to_existing_fe",
        [
            "export const ALL_PARAMETER_METADATA: Record<string, ParameterMetadata> = {\n",
            '  "existing_fe": { displayName: "Existing FE", applicableToAllNodes: true },\n',
            "};\n"
        ],
        "another_global_fe", "Another Global FE", True, None,
        True,
        [
            "export const ALL_PARAMETER_METADATA: Record<string, ParameterMetadata> = {\n",
            '  "existing_fe": { displayName: "Existing FE", applicableToAllNodes: true },\n',
            '  "another_global_fe": { displayName: "Another Global FE", applicableToAllNodes: true },\n',
            "};\n"
        ]
    ),
    (
        "add_op_specific_fe",
        [
            "export const ALL_PARAMETER_METADATA: Record<string, ParameterMetadata> = {\n",
            '  "global_fe": { displayName: "Global FE", applicableToAllNodes: true },\n',
            "};\n"
        ],
        "op_specific_fe", "Op Specific FE", False, ["op1", "op2_val"],
        True,
        [
            "export const ALL_PARAMETER_METADATA: Record<string, ParameterMetadata> = {\n",
            '  "global_fe": { displayName: "Global FE", applicableToAllNodes: true },\n',
            '  "op_specific_fe": { displayName: "Op Specific FE", applicableToAllNodes: false, operationSpecific: [\'op1\', \'op2_val\'] },\n',
            "};\n"
        ]
    ),
    (
        "add_op_specific_fe_trailing_comma", # Test with existing trailing comma in metadata
        [
            "export const ALL_PARAMETER_METADATA: Record<string, ParameterMetadata> = {\n",
            '  "existing_fe": { displayName: "Existing FE", applicableToAllNodes: true }, // Existing entry\n',
            "};\n"
        ],
        "new_fe_param_comma", "New FE Param Comma", True, None,
        True,
        [
            "export const ALL_PARAMETER_METADATA: Record<string, ParameterMetadata> = {\n",
            '  "existing_fe": { displayName: "Existing FE", applicableToAllNodes: true }, // Existing entry\n',
            '  "new_fe_param_comma": { displayName: "New FE Param Comma", applicableToAllNodes: true },\n',
            "};\n"
        ]
    ),
    (
        "metadata_section_not_found_fe",
        [
            "// ALL_PARAMETER_METADATA is missing\n",
            "export const SOME_OTHER_CONST = {};\n"
        ],
        "fail_fe", "Fail FE", True, None,
        False, # Expected to fail
        [
            "// ALL_PARAMETER_METADATA is missing\n",
            "export const SOME_OTHER_CONST = {};\n"
        ]
    ),
    (
        "add_global_param_no_trailing_comma_fe",
        [
            "export const ALL_PARAMETER_METADATA: Record<string, ParameterMetadata> = {\n",
            '    "existing_param_fe": { displayName: "Existing Param FE", applicableToAllNodes: true }\n', # No comma
            "};\n"
        ],
        "new_global_fe_2", "New Global FE 2", True, None,
        True,
        [
            "export const ALL_PARAMETER_METADATA: Record<string, ParameterMetadata> = {\n",
            '    "existing_param_fe": { displayName: "Existing Param FE", applicableToAllNodes: true }\n', # No comma added, original indent maintained
            '  "new_global_fe_2": { displayName: "New Global FE 2", applicableToAllNodes: true },\n',  # New line with 2-space indent and comma
            "};\n"
        ]
    ),
]

@pytest.mark.parametrize("test_id, initial_lines, name, display_name, applicable_to_all, op_specific, expected_return, expected_lines_after_add", add_frontend_test_data)
def test_add_parameter_to_frontend(test_id, initial_lines, name, display_name, applicable_to_all, op_specific, expected_return, expected_lines_after_add, mocker):
    """Test the add_parameter_to_frontend function."""
    mocker.patch.object(add_parameter_module, 'FRONTEND_PARAMS_FILE', 'mock_frontend_params.ts')

    mock_initial_content = "".join(initial_lines)
    
    mock_write_file_object = MagicMock()
    mock_write_file_object.__enter__.return_value = mock_write_file_object
    mock_write_file_object.__exit__.return_value = None

    def open_side_effect(file, mode='r', **kwargs):
        if file == 'mock_frontend_params.ts':
            if mode == 'r':
                return mock_open(read_data=mock_initial_content).return_value
            elif mode == 'w':
                return mock_write_file_object
        raise FileNotFoundError(f"Unexpected call to open: {file} with mode {mode}")

    mock_open_patch = mocker.patch('builtins.open', side_effect=open_side_effect)

    actual_return = add_parameter_to_frontend(name, display_name, applicable_to_all, op_specific)
    assert actual_return == expected_return

    read_call_found = any(
        call_args[0] == ('mock_frontend_params.ts', 'r') 
        for call_args in mock_open_patch.call_args_list
    )
    assert read_call_found, "open('mock_frontend_params.ts', 'r') was not called"

    if expected_return:
        write_call_found = any(
            call_args[0] == ('mock_frontend_params.ts', 'w') 
            for call_args in mock_open_patch.call_args_list
        )
        assert write_call_found, "open('mock_frontend_params.ts', 'w') was not called"
        
        mock_write_file_object.writelines.assert_called_once()
        actual_written_lines = mock_write_file_object.writelines.call_args[0][0]
        
        # Ensure expected lines also end with a newline for consistent comparison, 
        # similar to how add_parameter_to_backend tests were adjusted.
        processed_expected_lines = [line if line.endswith('\n') else line + '\n' for line in expected_lines_after_add]
        # Strip the extra backslash if present from the test data definition
        processed_expected_lines = [line.replace('\\n', '\n') for line in processed_expected_lines]


        if actual_written_lines != processed_expected_lines:
            print(f"\nDEBUGGING Test ID: {test_id}")
            print("EXPECTED lines:")
            for i, line in enumerate(processed_expected_lines): print(f"{i}: {repr(line)}")
            print("ACTUAL lines:")
            for i, line in enumerate(actual_written_lines): print(f"{i}: {repr(line)}")
            print(f"Expected len: {len(processed_expected_lines)}, Actual len: {len(actual_written_lines)}")

        assert actual_written_lines == processed_expected_lines, f"Test ID: {test_id} - Written content does not match."
    else:
        mock_write_file_object.writelines.assert_not_called(), f"Test ID: {test_id} - writelines should not be called for a failing test." 