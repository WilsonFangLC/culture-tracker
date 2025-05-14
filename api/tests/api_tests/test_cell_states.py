import pytest
from httpx import AsyncClient
from datetime import datetime, timezone

# Basic test data for creating a cell state
# We'll use this and potentially vary it in other tests
SAMPLE_CELL_STATE_CREATE_DATA = {
    "name": "Test State 1",
    "timestamp": datetime.now(timezone.utc).isoformat(), # Ensure ISO format string
    "parameters": {"volume": 10, "cell_count": 1e6},
    "parent_id": None,
    "transition_type": "seeding",
    "additional_notes": "Initial test state"
}

@pytest.mark.asyncio
async def test_create_cell_state(client: AsyncClient):
    """
    Test creating a new cell state.
    """
    response = await client.post("/api/states/", json=SAMPLE_CELL_STATE_CREATE_DATA)

    assert response.status_code == 200 # Or 201 if your API returns that for POST
    
    created_state = response.json()
    assert created_state["id"] is not None
    assert created_state["name"] == SAMPLE_CELL_STATE_CREATE_DATA["name"]
    assert created_state["parameters"] == SAMPLE_CELL_STATE_CREATE_DATA["parameters"]
    assert created_state["parent_id"] == SAMPLE_CELL_STATE_CREATE_DATA["parent_id"]
    assert created_state["transition_type"] == SAMPLE_CELL_STATE_CREATE_DATA["transition_type"]
    assert created_state["additional_notes"] == SAMPLE_CELL_STATE_CREATE_DATA["additional_notes"]
    
    # Validate timestamp (it will be a string in the JSON response)
    # Compare by parsing the response timestamp and comparing with the original datetime object
    # or by comparing the string representations if timezone handling is consistent.
    response_timestamp = datetime.fromisoformat(created_state["timestamp"].replace("Z", "+00:00"))
    original_timestamp = datetime.fromisoformat(SAMPLE_CELL_STATE_CREATE_DATA["timestamp"].replace("Z", "+00:00")) # Ensure original is also parsed consistently if it could have Z
    assert response_timestamp == original_timestamp

    # Store the ID for potential use in other tests (e.g., get, update, delete)
    # This can be done by returning it or making it available via a fixture if needed across test functions.
    # For now, we'll just assert its presence.
    # Future tests for GET, PATCH, DELETE will likely create their own specific states
    # to ensure test independence, or use a shared state created in a fixture. 

@pytest.mark.asyncio
async def test_read_cell_states_list(client: AsyncClient):
    """
    Test reading a list of cell states.
    Ensures that created states appear in the list.
    """
    # Create a couple of states to ensure the list is not empty
    # and we can check for their presence.
    state_data_1 = {
        "name": "List Test State 1",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "parameters": {"param1": "value1"},
        "transition_type": "passage"
    }
    state_data_2 = {
        "name": "List Test State 2",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "parameters": {"param2": "value2"},
        "parent_id": None, # Explicitly None
        "transition_type": "thaw"
    }

    response1 = await client.post("/api/states/", json=state_data_1)
    assert response1.status_code == 200
    created_state_1 = response1.json()

    response2 = await client.post("/api/states/", json=state_data_2)
    assert response2.status_code == 200
    created_state_2 = response2.json()

    # Now, get the list of states
    list_response = await client.get("/api/states/")
    assert list_response.status_code == 200
    
    states_list = list_response.json()
    assert isinstance(states_list, list)
    
    # Check if the created states are in the list
    # We'll check by IDs, assuming IDs are unique and present
    ids_in_list = [state["id"] for state in states_list]
    assert created_state_1["id"] in ids_in_list
    assert created_state_2["id"] in ids_in_list

    # Optionally, verify the structure of one item in the list more thoroughly
    # For example, find one of our created states in the list and check its fields
    found_state_1 = next((s for s in states_list if s["id"] == created_state_1["id"]), None)
    assert found_state_1 is not None
    assert found_state_1["name"] == state_data_1["name"]
    assert found_state_1["parameters"] == state_data_1["parameters"] 

@pytest.mark.asyncio
async def test_read_single_cell_state(client: AsyncClient):
    """
    Test reading a single cell state by its ID.
    """
    state_data_to_create = {
        "name": "Detail Test State",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "parameters": {"concentration": 0.5, "viability": 95.0},
        "transition_type": "measurement"
    }
    
    # Create a state first
    create_response = await client.post("/api/states/", json=state_data_to_create)
    assert create_response.status_code == 200
    created_state = create_response.json()
    created_state_id = created_state["id"]

    # Now, fetch this specific state by its ID
    get_response = await client.get(f"/api/states/{created_state_id}")
    assert get_response.status_code == 200
    
    fetched_state = get_response.json()
    
    # Verify the details match the created state
    assert fetched_state["id"] == created_state_id
    assert fetched_state["name"] == state_data_to_create["name"]
    assert fetched_state["parameters"] == state_data_to_create["parameters"]
    assert fetched_state["transition_type"] == state_data_to_create["transition_type"]
    # Timestamps should also match
    assert datetime.fromisoformat(fetched_state["timestamp"].replace("Z", "+00:00")) == datetime.fromisoformat(state_data_to_create["timestamp"].replace("Z", "+00:00"))

    # Test fetching a non-existent state ID
    non_existent_id = 9999999 # Assuming this ID won't exist
    error_response = await client.get(f"/api/states/{non_existent_id}")
    assert error_response.status_code == 404 

@pytest.mark.asyncio
async def test_update_cell_state(client: AsyncClient):
    """
    Test updating an existing cell state.
    """
    # First, create a state to update
    original_state_data = {
        "name": "Update Test Initial",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "parameters": {"initial_param": "value_A", "common_param": "original"},
        "additional_notes": "Original notes for update test"
    }
    create_response = await client.post("/api/states/", json=original_state_data)
    assert create_response.status_code == 200
    created_state = create_response.json()
    created_state_id = created_state["id"]

    # Data for updating the state
    update_payload = {
        # "name": "Update Test Patched", # Assuming name is not updatable via PATCH in your schema
        "parameters": {"common_param": "updated_value", "new_param": "value_B"},
        "additional_notes": "Updated notes via PATCH"
    }

    # Send the PATCH request
    update_response = await client.patch(f"/api/states/{created_state_id}", json=update_payload)
    assert update_response.status_code == 200
    
    updated_state_from_response = update_response.json()

    # Verify the response reflects the changes
    # Name should remain unchanged if not part of PATCH schema or not provided
    assert updated_state_from_response["name"] == original_state_data["name"] 
    
    # Parameters should be merged/updated
    expected_parameters = original_state_data["parameters"].copy()
    expected_parameters.update(update_payload["parameters"]) # Simulate the merge
    assert updated_state_from_response["parameters"] == expected_parameters
    
    assert updated_state_from_response["additional_notes"] == update_payload["additional_notes"]
    assert updated_state_from_response["id"] == created_state_id

    # Optionally, make another GET request to verify the update persisted
    get_response = await client.get(f"/api/states/{created_state_id}")
    assert get_response.status_code == 200
    fetched_updated_state = get_response.json()
    
    assert fetched_updated_state["parameters"] == expected_parameters
    assert fetched_updated_state["additional_notes"] == update_payload["additional_notes"]

    # Test updating a non-existent state ID
    non_existent_id = 9999998 # Assuming this ID won't exist
    error_response = await client.patch(f"/api/states/{non_existent_id}", json=update_payload)
    assert error_response.status_code == 404

    # Test sending empty update data (should probably be a 400 or no change)
    # Based on your main.py logic, it raises a 400
    empty_update_response = await client.patch(f"/api/states/{created_state_id}", json={})
    assert empty_update_response.status_code == 400 

@pytest.mark.asyncio
async def test_delete_cell_state(client: AsyncClient):
    """
    Test deleting an existing cell state.
    """
    # First, create a state to delete
    state_to_delete_data = {
        "name": "Delete Test State",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "parameters": {"to_be_deleted": True},
    }
    create_response = await client.post("/api/states/", json=state_to_delete_data)
    assert create_response.status_code == 200
    created_state = create_response.json()
    created_state_id = created_state["id"]

    # ---- Add this check ----
    get_it_first_response = await client.get(f"/api/states/{created_state_id}")
    assert get_it_first_response.status_code == 200 
    # ---- End of added check ----

    # Send the DELETE request -注意: path is /api/cell_states/
    delete_response = await client.delete(f"/api/cell_states/{created_state_id}")
    assert delete_response.status_code == 204 # No Content

    # Verify the state is actually deleted by trying to GET it (should be 404)
    get_response = await client.get(f"/api/states/{created_state_id}")
    assert get_response.status_code == 404

    # Test deleting a non-existent state ID
    non_existent_id = 9999997 # Assuming this ID won't exist
    error_delete_response = await client.delete(f"/api/cell_states/{non_existent_id}")
    assert error_delete_response.status_code == 404 # As per your cell_states router logic

    # Test deleting a state with children (should be 409 Conflict)
    # This requires creating a parent and a child state first.
    parent_data = {
        "name": "Parent State for Delete Test",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "parameters": {"is_parent": True}
    }
    parent_response = await client.post("/api/states/", json=parent_data)
    assert parent_response.status_code == 200
    parent_state = parent_response.json()
    parent_id = parent_state["id"]

    child_data = {
        "name": "Child State for Delete Test",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "parameters": {"is_child": True},
        "parent_id": parent_id # Link to the parent
    }
    child_response = await client.post("/api/states/", json=child_data)
    assert child_response.status_code == 200
    # child_state = child_response.json() # Not strictly needed for this test part

    # Try to delete the parent state which now has a child
    delete_parent_response = await client.delete(f"/api/cell_states/{parent_id}")
    assert delete_parent_response.status_code == 409 # Conflict 

# Step 1.6: Tests for Important Error Conditions

@pytest.mark.asyncio
async def test_create_cell_state_missing_timestamp(client: AsyncClient):
    """Test creating a cell state with a missing timestamp."""
    response = await client.post("/api/states/", json={
        "name": "Error State No Timestamp",
        # "timestamp": "2023-01-01T12:00:00Z", # Missing
        "parameters": {"param1": "value1"},
        "transition_type": "passage"
    })
    assert response.status_code == 422  # Unprocessable Entity
    # Optionally, check the error detail
    response_data = response.json()
    assert any(err["loc"] == ["body", "timestamp"] and err["type"] == "missing" for err in response_data["detail"])


@pytest.mark.asyncio
async def test_create_cell_state_missing_parameters(client: AsyncClient):
    """Test creating a cell state with missing parameters."""
    response = await client.post("/api/states/", json={
        "name": "Error State No Params",
        "timestamp": "2023-01-01T12:00:00Z",
        # "parameters": {"param1": "value1"}, # Missing
        "transition_type": "passage"
    })
    assert response.status_code == 422
    response_data = response.json()
    assert any(err["loc"] == ["body", "parameters"] and err["type"] == "missing" for err in response_data["detail"])


@pytest.mark.asyncio
async def test_create_cell_state_invalid_timestamp_format(client: AsyncClient):
    """Test creating a cell state with an invalid timestamp format."""
    response = await client.post("/api/states/", json={
        "name": "Error State Invalid Timestamp",
        "timestamp": "not-a-valid-date",
        "parameters": {"param1": "value1"},
        "transition_type": "passage"
    })
    assert response.status_code == 422
    response_data = response.json()
    # Depending on FastAPI/Pydantic version, the error type might be different
    # e.g., 'datetime_parsing', 'value_error.datetime'
    # We'll check for location 'timestamp' and that there's an error message
    assert any(err["loc"] == ["body", "timestamp"] and "msg" in err for err in response_data["detail"])


@pytest.mark.asyncio
async def test_create_cell_state_invalid_parameters_type(client: AsyncClient):
    """Test creating a cell state with parameters not being a dictionary."""
    response = await client.post("/api/states/", json={
        "name": "Error State Invalid Params Type",
        "timestamp": "2023-01-01T12:00:00Z",
        "parameters": "not-a-dictionary",
        "transition_type": "passage"
    })
    assert response.status_code == 422
    response_data = response.json()
    assert any(err["loc"] == ["body", "parameters"] and ("msg" in err or "type" in err) for err in response_data["detail"])

@pytest.mark.asyncio
async def test_delete_non_existent_cell_state(client: AsyncClient):
    """Test deleting a cell state that does not exist."""
    non_existent_id = 999999
    response = await client.delete(f"/api/cell_states/{non_existent_id}")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_update_non_existent_cell_state(client: AsyncClient):
    """Test updating a cell state that does not exist using PUT (expecting 405)."""
    non_existent_id = 999999
    update_data = {"parameters": {"updated_param": "new_value"}}
    response = await client.put(f"/api/states/{non_existent_id}", json=update_data)
    assert response.status_code == 405 # Method Not Allowed, as PUT is not defined

# Add further error condition tests below 