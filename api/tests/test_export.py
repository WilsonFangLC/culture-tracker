import pytest
from httpx import AsyncClient # Replace TestClient
import csv
import io
from datetime import datetime, timezone # For creating test data
import json
from sqlmodel import Session # Import Session for type hinting

# Assuming the main app object is accessible via from app.main import app
# Adjust the import path if necessary
# from app.main import app # Already here, but client fixture will handle app
from app.models import CellState # For creating test data
from app.schemas import CellStateCreate # For creating test data
from app.utils.parameters import ALL_POSSIBLE_PARAMETERS, ALL_PARAMETER_METADATA, is_parameter_applicable # For header checks and test logic

# client = fastapi_testclient.TestClient(app) # Comment out module-level client

# We might need to mock the database session and authentication
# For simplicity, this test assumes the endpoint is accessible
# and might rely on data in the actual dev database if not mocked.

# @pytest.mark.skip(reason="Test needs proper DB and auth mocking") # Unskip
@pytest.mark.asyncio # Add asyncio mark
async def test_export_cell_states_csv_authenticated(client: AsyncClient): # Use AsyncClient fixture
    # client = fastapi_testclient.TestClient(app) # Instantiate here for testing -- REMOVE
    """Tests the CSV export endpoint with authentication (mocked/skipped for now)."""
    # Replace with actual authenticated client setup
    # headers = {"Authorization": "Bearer <your_test_token>"}
    # response = await client.get("/api/export/csv", headers=headers) # Add await
    response = await client.get("/api/export/csv") # Assuming no auth for now, add await

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8" # More specific
    assert "attachment; filename=" in response.headers["content-disposition"]
    assert response.headers["content-disposition"].endswith(".csv\"") # Corrected syntax

    # Basic check of CSV content
    content = response.content.decode("utf-8")
    reader = csv.reader(io.StringIO(content))
    
    # Skip legend
    next(reader) # LEGEND:
    next(reader) # 'N/A' explanation
    next(reader) # 'empty' explanation
    next(reader) # blank row

    # Check header row - This will need to be more dynamic
    header = next(reader)
    # Construct expected headers dynamically (simplified for now, will be more complex)
    expected_base_headers = [
        "ID", "Name (global)", "Timestamp (global)", "Parent ID (global)", 
        "Transition Type (global)", "Additional Notes (global)", "Notes (global)"
    ]
    # This is a placeholder, real dynamic header construction will be needed.
    # For a truly empty DB, it should reflect ALL_POSSIBLE_PARAMETERS
    # We will refine this in the empty DB test.
    # For now, check if base headers are a subset.
    for h in expected_base_headers:
        assert h in header


    # Optionally, check if there are data rows (if test data exists)
    # For this test, assume it might be empty or have data from other tests.
    # try:
    #     first_data_row = next(reader)
    #     assert len(first_data_row) == len(header) # Check against actual header length
    # except StopIteration:
    #     # This is acceptable if the test database is empty
    #     pass

# Add a test for the case when no data exists (optional)
# @pytest.mark.skip(reason="Test needs proper DB setup for empty state") # Unskip
@pytest.mark.asyncio # Add asyncio mark
async def test_export_empty_csv(client: AsyncClient, db_session): # Use AsyncClient and db_session
    # client = fastapi_testclient.TestClient(app) # Instantiate here for testing -- REMOVE
    """Tests the CSV export when there is no data."""
    # Setup: Ensure the database is empty for this test
    # (db_session fixture already provides a clean session, rollback ensures it's empty for this test)
    
    response = await client.get("/api/export/csv") # Add await
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8" # More specific
    content = response.content.decode("utf-8")
    reader = csv.reader(io.StringIO(content))
    
    # Determine expected number of columns for the blank row check
    # Base headers (7) + number of all possible parameters
    expected_column_count = 7 + len(ALL_POSSIBLE_PARAMETERS)

    # Skip legend rows and blank row
    assert next(reader)[0] == "LEGEND:"
    assert next(reader)[0].startswith("'N/A'")
    assert next(reader)[0].startswith("'empty'")
    # Check blank row: it should have one empty string for each expected column
    assert next(reader) == [''] * expected_column_count 

    header = next(reader)
    
    # Expected headers when DB is empty:
    # Base headers + all known parameters from ALL_POSSIBLE_PARAMETERS, formatted.
    expected_display_headers = [
        "ID", "Name (global)", "Timestamp (global)", "Parent ID (global)", 
        "Transition Type (global)", "Additional Notes (global)", "Notes (global)"
    ]
    
    sorted_param_keys = sorted(list(ALL_POSSIBLE_PARAMETERS)) # Ensure consistent order

    for key in sorted_param_keys:
        metadata = ALL_PARAMETER_METADATA.get(key, {})
        display_name = metadata.get("displayName", key)
        if metadata.get("applicableToAllNodes", False):
            expected_display_headers.append(f"{display_name} (global)")
        elif "operationSpecific" in metadata:
            op_specific = ", ".join(metadata.get("operationSpecific", []))
            expected_display_headers.append(f"{display_name} ({op_specific} specific)")
        else:
            expected_display_headers.append(display_name)
            
    assert header == expected_display_headers
    
    # Check that there are no more rows after headers
    with pytest.raises(StopIteration):
        next(reader) 

@pytest.mark.asyncio
async def test_export_cell_states_csv_with_data(client: AsyncClient, db_session: Session):
    """Tests the CSV export with a variety of cell state data."""
    # 1. Create diverse CellState objects
    base_time = datetime.now(timezone.utc)
    state1_params = {
        "volume": 10.5,
        "cell_count_total": 2.5e6,
        "custom_field_text": "Some text",
        "transition_parameters": {
            "operation_type": "passage",
            "passage_number": 5,
            "source_vessel_id": "VesselA",
            "cell_type": "HEK293" # Will be used as cell_type is None below
        }
    }
    state1 = CellStateCreate(
        name="State1_Passage", 
        timestamp=base_time, 
        parameters=state1_params,
        # cell_type will be picked from transition_parameters
    )
    db_session.add(CellState.model_validate(state1))

    state2_params = {
        "freeze_medium": "CryoStorCS10",
        "cell_count_total": 1e7,
        "cell_type": "CHO", # Directly specified
        "transition_parameters": {
            "operation_type": "freeze",
            "number_of_vials": 10
        },
        "custom_dict_param": {"key": "value", "num": 123},
        "custom_list_param": ["a", "b", "c"]
    }
    state2 = CellStateCreate(
        name="State2_Freeze", 
        timestamp=datetime(base_time.year, base_time.month, base_time.day + 1, tzinfo=timezone.utc),
        parameters=state2_params
    )
    db_session.add(CellState.model_validate(state2))

    state3_params = {
        "cell_count_total": 5e5,
        "cell_type": "Fibroblast",
        "transition_parameters": {
            "operation_type": "thaw",
            # 'thaw_volume' is applicable to thaw, so should have a value or be empty if not provided
            # 'passage_number' is NOT applicable to thaw, so should be N/A
            "passage_number": 100 # This should result in N/A for passage_number column
        }
    }
    state3 = CellStateCreate(
        name="State3_Thaw_NA_Test", 
        timestamp=datetime(base_time.year, base_time.month, base_time.day + 2, tzinfo=timezone.utc),
        parameters=state3_params,
        notes="Testing N/A value for passage_number"
    )
    db_session.add(CellState.model_validate(state3))
    
    state4_params = {
        "cell_type": "Hybridoma",
        "transition_parameters": {
            "operation_type": "start_new_culture",
            # 'culture_medium' is applicable, but not provided, so should be empty string
        }
    }
    state4 = CellStateCreate(
        name="State4_Start_Empty_Test",
        timestamp=datetime(base_time.year, base_time.month, base_time.day + 3, tzinfo=timezone.utc),
        parameters=state4_params,
        additional_notes="Testing empty value for culture_medium"
    )
    db_session.add(CellState.model_validate(state4))

    db_session.commit()
    
    # Refresh states to get IDs and relationship attributes populated if any
    # (Not strictly necessary here as we re-fetch via API which uses a new session context)

    # 2. Call the export endpoint
    response = await client.get("/api/export/csv")
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"

    # 3. Parse and verify CSV content
    content = response.content.decode("utf-8")
    reader = csv.reader(io.StringIO(content))

    # Skip legend and blank row
    assert next(reader)[0] == "LEGEND:"
    assert next(reader)[0].startswith("'N/A'")
    assert next(reader)[0].startswith("'empty'")
    
    # Dynamically create expected headers once to compare against actual headers
    # and to map row data correctly
    expected_base_headers_map = {
        "ID": "id", "Name (global)": "name", "Timestamp (global)": "timestamp", 
        "Parent ID (global)": "parent_id", "Transition Type (global)": "transition_type",
        "Additional Notes (global)": "additional_notes", "Notes (global)": "notes"
    }
    
    # Get all unique parameter keys that should be in the CSV from the created states
    # and ALL_POSSIBLE_PARAMETERS
    temp_states_for_header_calc = [
        CellState.model_validate(s) for s in [state1, state2, state3, state4]
    ]

    # Simulate how collect_all_parameter_keys works internally for header generation
    # This needs to match the logic in app.routers.export.py
    all_param_keys_from_data_and_known = set()
    for s_obj in temp_states_for_header_calc:
        if isinstance(s_obj.parameters, dict):
            all_param_keys_from_data_and_known.update(s_obj.parameters.keys())
            if 'transition_parameters' in s_obj.parameters and isinstance(s_obj.parameters['transition_parameters'], dict):
                 all_param_keys_from_data_and_known.update(s_obj.parameters['transition_parameters'].keys())
    all_param_keys_from_data_and_known.update(ALL_POSSIBLE_PARAMETERS)
    if 'transition_parameters' in all_param_keys_from_data_and_known:
        all_param_keys_from_data_and_known.remove('transition_parameters') # It's flattened

    sorted_all_param_keys = sorted(list(all_param_keys_from_data_and_known))

    expected_param_headers_map = {}
    current_expected_headers_list = list(expected_base_headers_map.keys())

    for key in sorted_all_param_keys:
        metadata = ALL_PARAMETER_METADATA.get(key, {})
        display_name = metadata.get("displayName", key)
        header_name = ""
        if metadata.get("applicableToAllNodes", False):
            header_name = f"{display_name} (global)"
        elif "operationSpecific" in metadata:
            op_specific = ", ".join(metadata.get("operationSpecific", []))
            header_name = f"{display_name} ({op_specific} specific)"
        else:
            header_name = display_name
        current_expected_headers_list.append(header_name)
        expected_param_headers_map[header_name] = key # Map display header to original key
    
    # Blank row before header
    assert next(reader) == [''] * len(current_expected_headers_list)
    actual_header_row = next(reader)
    assert actual_header_row == current_expected_headers_list

    # Create a map of header display name to its index
    header_to_index = {name: i for i, name in enumerate(actual_header_row)}

    # Verify data rows
    db_states = db_session.query(CellState).order_by(CellState.timestamp).all()
    assert len(db_states) == 4 # We created 4 states

    for i, db_state in enumerate(db_states):
        row = next(reader)
        
        # Verify base fields
        assert row[header_to_index["ID"]] == str(db_state.id)
        assert row[header_to_index["Name (global)"]] == db_state.name
        assert row[header_to_index["Timestamp (global)"]] == db_state.timestamp.isoformat()
        assert row[header_to_index["Parent ID (global)"]] == (str(db_state.parent_id) if db_state.parent_id else "")
        assert row[header_to_index["Transition Type (global)"]] == (db_state.transition_type if db_state.transition_type else "")
        assert row[header_to_index["Additional Notes (global)"]] == (db_state.additional_notes if db_state.additional_notes else "")
        assert row[header_to_index["Notes (global)"]] == (db_state.notes if db_state.notes else "")

        # Verify parameters (complex part)
        flat_params_from_db = {}
        db_operation_type = None
        db_cell_type_from_transition = None

        if isinstance(db_state.parameters, dict):
            if 'transition_parameters' in db_state.parameters and isinstance(db_state.parameters['transition_parameters'], dict):
                db_operation_type = db_state.parameters['transition_parameters'].get('operation_type')
                db_cell_type_from_transition = db_state.parameters['transition_parameters'].get('cell_type')
                for k, v in db_state.parameters['transition_parameters'].items():
                    flat_params_from_db[k] = v
            for k, v in db_state.parameters.items():
                if k != 'transition_parameters':
                    if k == 'cell_type' and (v is None or v == '') and db_cell_type_from_transition:
                        flat_params_from_db[k] = db_cell_type_from_transition
                    elif k not in flat_params_from_db: # Prioritize transition_params if key collision (though export logic might differ slightly, aim for result)
                        flat_params_from_db[k] = v
        
        # Special handling for cell_type if it wasn't in main params but in transition
        if 'cell_type' not in flat_params_from_db and db_cell_type_from_transition:
            flat_params_from_db['cell_type'] = db_cell_type_from_transition


        for param_display_name, param_original_key in expected_param_headers_map.items():
            actual_value_in_csv = row[header_to_index[param_display_name]]
            expected_value_in_db = flat_params_from_db.get(param_original_key)
            
            # Use the actual function to determine applicability
            is_app = is_parameter_applicable(param_original_key, db_operation_type)

            if not is_app:
                assert actual_value_in_csv == "N/A", f"Param '{param_original_key}' ({param_display_name}) for state '{db_state.name}' (op: {db_operation_type}) should be N/A according to is_parameter_applicable, got '{actual_value_in_csv}'"
            elif expected_value_in_db is None:
                # If it's applicable AND the value is None (meaning it's an optional applicable field not provided for THIS state)
                assert actual_value_in_csv == "", f"Param '{param_original_key}' ({param_display_name}) for state '{db_state.name}' (op: {db_operation_type}) is applicable but None, should be empty string, got '{actual_value_in_csv}'"
            elif isinstance(expected_value_in_db, datetime):
                assert actual_value_in_csv == expected_value_in_db.isoformat()
            elif isinstance(expected_value_in_db, dict) or isinstance(expected_value_in_db, list):
                assert actual_value_in_csv == json.dumps(expected_value_in_db), f"Param {param_original_key} JSON dump mismatch"
            else:
                assert actual_value_in_csv == str(expected_value_in_db), f"Param {param_original_key} string value mismatch"

    # Ensure no more data rows
    with pytest.raises(StopIteration):
        next(reader) 