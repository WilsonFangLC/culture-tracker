import pytest
from fastapi import testclient as fastapi_testclient
import csv
import io

# Assuming the main app object is accessible via from app.main import app
# Adjust the import path if necessary
from app.main import app 

# client = fastapi_testclient.TestClient(app) # Comment out module-level client

# We might need to mock the database session and authentication
# For simplicity, this test assumes the endpoint is accessible
# and might rely on data in the actual dev database if not mocked.

@pytest.mark.skip(reason="Test needs proper DB and auth mocking")
def test_export_cell_states_csv_authenticated():
    client = fastapi_testclient.TestClient(app) # Instantiate here for testing
    """Tests the CSV export endpoint with authentication (mocked/skipped for now)."""
    # Replace with actual authenticated client setup
    # headers = {"Authorization": "Bearer <your_test_token>"}
    # response = client.get("/api/export/csv", headers=headers)
    response = client.get("/api/export/csv") # Assuming no auth for now

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv"
    assert "attachment; filename=" in response.headers["content-disposition"]
    assert response.headers["content-disposition"].endswith(".csv\"")

    # Basic check of CSV content
    content = response.content.decode("utf-8")
    reader = csv.reader(io.StringIO(content))
    
    # Check header row
    header = next(reader)
    expected_headers = [
        "id", "name", "timestamp", "parent_id", "parameters",
        "notes", "transition_type", "additional_notes"
    ]
    assert header == expected_headers

    # Optionally, check if there are data rows (if test data exists)
    # try:
    #     first_data_row = next(reader)
    #     assert len(first_data_row) == len(expected_headers)
    # except StopIteration:
    #     # This is acceptable if the test database is empty
    #     pass

# Add a test for the case when no data exists (optional)
@pytest.mark.skip(reason="Test needs proper DB setup for empty state")
def test_export_empty_csv():
    client = fastapi_testclient.TestClient(app) # Instantiate here for testing
    """Tests the CSV export when there is no data."""
    # Setup: Ensure the database is empty for this test
    
    response = client.get("/api/export/csv") # Assuming no auth for now
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv"
    content = response.content.decode("utf-8")
    reader = csv.reader(io.StringIO(content))
    
    # Skip legend rows and blank row
    next(reader)  # LEGEND
    next(reader)  # N/A explanation
    next(reader)  # empty explanation
    next(reader)  # blank row
    
    header = next(reader)
    # Expected updated headers with proper formatting
    assert "ID" in header
    assert "Name (global)" in header
    assert "Timestamp (global)" in header
    assert "Parent ID (global)" in header
    
    # Check that there are no more rows after headers
    with pytest.raises(StopIteration):
        next(reader) 