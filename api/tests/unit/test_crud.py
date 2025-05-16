import pytest
from unittest.mock import MagicMock, patch
from typing import List, Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException

# Assuming your project structure allows this import
# Adjust if your models and schemas are located elsewhere relative to tests
from api.app.models import CellState
from api.app.schemas import CellStateCreate, CellStateRead # Added CellStateRead for potential use
from api.app import crud
from datetime import datetime

# TODO: Add test fixtures if needed (e.g., for a mock session or sample data)

# Tests for create_cell_state
def test_create_cell_state():
    mock_session = MagicMock(spec=Session)
    
    # Prepare input data for CellStateCreate
    # Ensure all required fields for CellStateCreate are provided.
    # Based on typical usage, let's assume name and timestamp are essential.
    # Parameters will be an empty dict for simplicity in this basic test.
    # Transition type and additional notes can be None or default values.
    current_time = datetime.utcnow()
    state_data = CellStateCreate(
        name="Test State", 
        timestamp=current_time,
        parameters={"param1": "value1"},
        # Optional fields, assuming defaults or None are acceptable by CellStateCreate
        parent_id=None, 
        transition_type=None,
        additional_notes=None
    )

    # Mock the CellState model to be returned by the session operations if needed,
    # or ensure the actual CellState model can be instantiated with state_data.model_dump()
    # For this test, we'll assume direct instantiation is fine.
    
    created_state = crud.create_cell_state(session=mock_session, state=state_data)

    mock_session.add.assert_called_once()
    mock_session.commit.assert_called_once()
    mock_session.refresh.assert_called_once()

    assert isinstance(created_state, CellState)
    assert created_state.name == state_data.name
    assert created_state.timestamp == state_data.timestamp
    assert created_state.parameters == state_data.parameters
    # Add assertions for other fields if they are set by CellState(**state.model_dump())
    assert created_state.parent_id == state_data.parent_id
    assert created_state.transition_type == state_data.transition_type
    assert created_state.additional_notes == state_data.additional_notes

# Tests for get_cell_states
def test_get_cell_states():
    mock_session = MagicMock(spec=Session)
    # Mock the return value of session.execute().scalars().all()
    # Create a few CellState objects for testing
    # Ensure these mock CellState objects have at least an 'id' or other key attributes
    # if your CellState model requires them for instantiation.
    # For simplicity, we assume CellState can be instantiated with basic attributes.
    mock_state1 = CellState(id=1, name="State 1", timestamp=datetime.utcnow(), parameters={})
    mock_state2 = CellState(id=2, name="State 2", timestamp=datetime.utcnow(), parameters={})
    mock_states_list = [mock_state1, mock_state2]

    # Configure the mock session to return the mock states
    # The chain of calls is session.execute(...).scalars().all()
    mock_execute_result = MagicMock()
    mock_execute_result.scalars.return_value.all.return_value = mock_states_list
    mock_session.execute.return_value = mock_execute_result

    # Call the function with default skip and limit
    retrieved_states = crud.get_cell_states(session=mock_session)

    mock_session.execute.assert_called_once()
    # We should also assert that the select statement was constructed correctly,
    # but that might require deeper patching of `select` or inspecting the call args to execute.
    # For now, we focus on the interaction with the session and the result.

    assert len(retrieved_states) == 2
    assert retrieved_states == mock_states_list
    assert retrieved_states[0].name == "State 1"
    assert retrieved_states[1].name == "State 2"

def test_get_cell_states_empty():
    mock_session = MagicMock(spec=Session)
    # Configure the mock session to return an empty list
    mock_execute_result = MagicMock()
    mock_execute_result.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_execute_result

    retrieved_states = crud.get_cell_states(session=mock_session)

    mock_session.execute.assert_called_once()
    assert len(retrieved_states) == 0
    assert retrieved_states == []

def test_get_cell_states_pagination():
    mock_session = MagicMock(spec=Session)
    # We don't need to mock the full list of states here, as we're testing
    # if skip and limit are applied to the query. The actual filtering
    # is done by SQLAlchemy, so we trust it works if the query is built correctly.
    # We will assert that offset and limit were called on the query object.

    # Mock the query object and its methods
    mock_query = MagicMock()
    mock_query.offset.return_value = mock_query # Enable chaining
    mock_query.limit.return_value = mock_query # Enable chaining

    # To test this properly, we need to patch `select` from `sqlmodel`
    # or inspect the arguments passed to `session.execute`.
    # A simpler approach for now: check that session.execute is called.
    # A more robust test would patch `select` from `sqlmodel` used within `crud.py`
    # and assert that `offset(5).limit(10)` were called on the mocked select object.

    # For this example, we'll just ensure execute is called.
    # The internal structure of the query generation (query.offset(skip).limit(limit))
    # is harder to mock directly without more complex patching of `select`.

    mock_execute_result = MagicMock()
    mock_execute_result.scalars.return_value.all.return_value = [] # Return empty for simplicity
    mock_session.execute.return_value = mock_execute_result

    # Test with skip and limit
    crud.get_cell_states(session=mock_session, skip=5, limit=10)
    mock_session.execute.assert_called_once()

    # To actually test if offset and limit are used, we'd need to inspect the argument to execute.
    # This requires knowing the structure of the query object passed to session.execute.
    # For example, if `crud.get_cell_states` was:
    # query = select(CellState)
    # query = query.offset(skip).limit(limit) # This is how it is structured
    # result = session.execute(query)
    # Then we can mock `select` and check calls on its return value.
    
    # Let's try patching select used by crud.py
    with patch('api.app.crud.select') as mock_sqlmodel_select:
        mock_statement = MagicMock()
        mock_sqlmodel_select.return_value = mock_statement
        mock_statement.offset.return_value.limit.return_value.scalars.return_value.all.return_value = []
        
        # Re-initialize mock_session for this patched context if necessary, or use a new one.
        mock_session_for_patch = MagicMock(spec=Session)
        mock_session_for_patch.execute.return_value.scalars.return_value.all.return_value = []

        crud.get_cell_states(session=mock_session_for_patch, skip=5, limit=10)

        mock_sqlmodel_select.assert_called_once_with(CellState)
        mock_statement.offset.assert_called_once_with(5)
        mock_statement.offset.return_value.limit.assert_called_once_with(10)
        mock_session_for_patch.execute.assert_called_once()

# Tests for get_cell_state
def test_get_cell_state_found():
    mock_session = MagicMock(spec=Session)
    mock_state = CellState(id=1, name="Test State", timestamp=datetime.utcnow(), parameters={})
    # Mock the children attribute to simulate relationship loading
    # In a real scenario, this would be a list of CellState objects or an empty list.
    mock_state.children = [] # Initialize as an empty list

    mock_session.get.return_value = mock_state

    retrieved_state = crud.get_cell_state(session=mock_session, state_id=1)

    mock_session.get.assert_called_once_with(CellState, 1)
    assert retrieved_state is not None
    assert retrieved_state.id == 1
    assert retrieved_state.name == "Test State"
    # Verify that the 'children' attribute was accessed (as per the function's logic `_ = state.children`)
    # This is a bit tricky to assert directly if `mock_state.children` itself isn't a mock.
    # However, if `get` returns our `mock_state`, and the code accesses `mock_state.children`,
    # it implies the logic was followed. A more explicit way would be to mock `mock_state.children`
    # if it were a callable or property with side effects we wanted to track.
    # For this simple access, ensuring the state is returned is the primary check.
    assert hasattr(retrieved_state, 'children') # Confirms the attribute exists

def test_get_cell_state_not_found():
    mock_session = MagicMock(spec=Session)
    mock_session.get.return_value = None

    retrieved_state = crud.get_cell_state(session=mock_session, state_id=99)

    mock_session.get.assert_called_once_with(CellState, 99)
    assert retrieved_state is None

# Tests for get_cell_state_lineage
def test_get_cell_state_lineage_not_found():
    mock_session = MagicMock(spec=Session)
    mock_session.get.return_value = None # Simulate state not found

    lineage = crud.get_cell_state_lineage(session=mock_session, state_id=99)
    
    mock_session.get.assert_called_once_with(CellState, 99)
    assert lineage == []

@pytest.fixture
def mock_lineage_session():
    mock_session = MagicMock(spec=Session)

    # Define states in a lineage
    # Grandparent (id=1) -> Parent (id=2) -> Child (id=3) -> Grandchild1 (id=4), Grandchild2 (id=5)
    grandparent = CellState(id=1, name="GP", timestamp=datetime.utcnow(), parameters={}, parent_id=None)
    parent = CellState(id=2, name="P", timestamp=datetime.utcnow(), parameters={}, parent_id=1)
    child = CellState(id=3, name="C", timestamp=datetime.utcnow(), parameters={}, parent_id=2)
    grandchild1 = CellState(id=4, name="GC1", timestamp=datetime.utcnow(), parameters={}, parent_id=3)
    grandchild2 = CellState(id=5, name="GC2", timestamp=datetime.utcnow(), parameters={}, parent_id=3)

    # Setup relationships (children lists)
    grandparent.children = [parent]
    parent.children = [child]
    child.children = [grandchild1, grandchild2]
    grandchild1.children = []
    grandchild2.children = []

    # Store them for easy lookup by mock_session.get
    states_map = {
        1: grandparent,
        2: parent,
        3: child,
        4: grandchild1,
        5: grandchild2,
    }

    def mock_get(model, state_id):
        # Ensure model is CellState for this mock
        if model is CellState:
            return states_map.get(state_id)
        return None # Or raise an error if unexpected model
    
    mock_session.get.side_effect = mock_get
    return mock_session

def test_get_cell_state_lineage_ancestors(mock_lineage_session):
    # Starting from Child (id=3), get ancestors
    # Expected: [Parent (id=2), Grandparent (id=1)] (order might vary depending on append logic)
    # The current crud implementation appends while traversing up, so parent then grandparent.
    lineage = crud.get_cell_state_lineage(session=mock_lineage_session, state_id=3, direction="ancestors")
    
    assert len(lineage) == 2
    # Convert to set of IDs for order-independent comparison if needed, or check names/IDs
    lineage_ids = {s.id for s in lineage}
    assert lineage_ids == {1, 2}
    # Or check in specific order if important
    assert lineage[0].id == 2 # Parent
    assert lineage[1].id == 1 # Grandparent

def test_get_cell_state_lineage_descendants(mock_lineage_session):
    # Starting from Parent (id=2), get descendants
    # Expected: [Child (id=3), Grandchild1 (id=4), Grandchild2 (id=5)] (order depends on traversal)
    # The current recursive implementation explores children, then their children.
    # So: child, then child's children (gc1, gc2).
    lineage = crud.get_cell_state_lineage(session=mock_lineage_session, state_id=2, direction="descendants")

    assert len(lineage) == 3
    lineage_ids = {s.id for s in lineage}
    assert lineage_ids == {3, 4, 5}
    # To be more specific about order based on current implementation:
    # Child (3) is added first. Then its children GC1 (4) and GC2 (5).
    # The exact order of GC1 and GC2 depends on the iteration order of child.children.
    assert any(s.id == 3 for s in lineage)
    assert any(s.id == 4 for s in lineage)
    assert any(s.id == 5 for s in lineage)
    # A more robust check for specific elements if order is not guaranteed:
    # Assuming states_map from fixture is accessible or re-declared for assertion comparison
    # For instance, ensure the objects themselves are present:
    # assert states_map[3] in lineage
    # assert states_map[4] in lineage
    # assert states_map[5] in lineage

def test_get_cell_state_lineage_both(mock_lineage_session):
    # Starting from Child (id=3), get both ancestors and descendants
    # Ancestors: [Parent (id=2), Grandparent (id=1)]
    # Descendants: [Grandchild1 (id=4), Grandchild2 (id=5)]
    # Total expected: 4 states
    lineage = crud.get_cell_state_lineage(session=mock_lineage_session, state_id=3, direction="both")

    assert len(lineage) == 4
    lineage_ids = {s.id for s in lineage}
    assert lineage_ids == {1, 2, 4, 5}
    # Check that both ancestor and descendant groups are present
    assert any(s.id == 1 for s in lineage) # Grandparent
    assert any(s.id == 2 for s in lineage) # Parent
    assert any(s.id == 4 for s in lineage) # Grandchild1
    assert any(s.id == 5 for s in lineage) # Grandchild2

def test_get_cell_state_lineage_no_relatives():
    mock_session = MagicMock(spec=Session)
    # State with no parent and no children
    # Ensure essential attributes like 'id', 'parent_id', and 'children' are present.
    # For a root node with no children:
    # - parent_id should be None
    # - children should be an empty list
    root_state = CellState(id=1, name="Root", timestamp=datetime.utcnow(), parameters={}, parent_id=None)
    root_state.children = [] # Explicitly set children as an empty list for clarity

    mock_session.get.return_value = root_state

    # Test for ancestors only
    lineage_ancestors = crud.get_cell_state_lineage(session=mock_session, state_id=1, direction="ancestors")
    assert lineage_ancestors == [], "Should have no ancestors"
    # Reset mock_session.get calls for the next assertion if needed, or use different mocks.
    # Here, we can rely on subsequent calls to get_cell_state_lineage to re-call session.get

    # Test for descendants only
    mock_session.get.return_value = root_state # Ensure it's reset if get is called multiple times
    lineage_descendants = crud.get_cell_state_lineage(session=mock_session, state_id=1, direction="descendants")
    assert lineage_descendants == [], "Should have no descendants"

    # Test for both
    mock_session.get.return_value = root_state
    lineage_both = crud.get_cell_state_lineage(session=mock_session, state_id=1, direction="both")
    assert lineage_both == [], "Should have no relatives for both directions"

    # Check how many times session.get was called. 
    # For each call to get_cell_state_lineage, session.get(CellState, state_id) is called once.
    # If the state has a parent_id, session.get is called again for the parent.
    # In this case, state_id=1 is the root, so no further session.get for parents.
    # The number of calls depends on how many times get_cell_state_lineage was called above.
    assert mock_session.get.call_count >= 3 # Called for each direction test

# Tests for delete_cell_state
def test_delete_cell_state_success_no_children():
    mock_session = MagicMock(spec=Session)
    # State with no children
    state_to_delete = CellState(id=1, name="To Delete", timestamp=datetime.utcnow(), parameters={})
    state_to_delete.children = [] # Explicitly no children

    mock_session.get.return_value = state_to_delete

    result = crud.delete_cell_state(session=mock_session, state_id=1)

    mock_session.get.assert_called_once_with(CellState, 1)
    mock_session.delete.assert_called_once_with(state_to_delete)
    mock_session.commit.assert_called_once()
    assert result is True

def test_delete_cell_state_not_found():
    mock_session = MagicMock(spec=Session)
    mock_session.get.return_value = None # Simulate state not found

    result = crud.delete_cell_state(session=mock_session, state_id=99)

    mock_session.get.assert_called_once_with(CellState, 99)
    mock_session.delete.assert_not_called()
    mock_session.commit.assert_not_called()
    assert result is False

def test_delete_cell_state_has_children():
    mock_session = MagicMock(spec=Session)
    # State with children
    state_with_children = CellState(id=1, name="Parent State", timestamp=datetime.utcnow(), parameters={})
    child_state = CellState(id=2, name="Child State", timestamp=datetime.utcnow(), parameters={}, parent_id=1)
    state_with_children.children = [child_state]

    mock_session.get.return_value = state_with_children

    with pytest.raises(HTTPException) as exc_info:
        crud.delete_cell_state(session=mock_session, state_id=1)
    
    assert exc_info.value.status_code == 409
    assert "Cannot delete state with children" in exc_info.value.detail
    mock_session.get.assert_called_once_with(CellState, 1)
    mock_session.delete.assert_not_called()
    mock_session.commit.assert_not_called() 