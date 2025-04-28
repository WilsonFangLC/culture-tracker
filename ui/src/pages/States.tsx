import { useState, useEffect } from 'react'
import { useStates, useCreateState, useUpdateState } from '../api'
import { CellState, CellStateCreate } from '../api'
import CreateStateForm from '../components/CreateStateForm'
import StateLineage from '../components/StateLineage'

export default function States() {
  const { data: statesData, isLoading: statesLoading, error: statesError } = useStates()
  const [selectedState, setSelectedState] = useState<CellState | null>(null)
  

  const createState = useCreateState()
  const updateState = useUpdateState()

  // Ensure states are always arrays
  const states = Array.isArray(statesData) ? statesData : []

  const [showCreateState, setShowCreateState] = useState(false)

  // Function to handle CSV export
  const handleExportCSV = async () => {
    try {
      // Fetch the CSV data from the backend
      const response = await fetch('/api/export/csv');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();

      // Create a link to download the blob
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Suggest a filename for the download
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.setAttribute('download', `cell_states_export_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();

      // Clean up by removing the link and revoking the URL
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Failed to export CSV:", error);
      // TODO: Show error message to the user
      alert("Failed to export CSV. Check the console for details.");
    }
  };

  // Reset selected state when states change
  useEffect(() => {
    
    if (states.length === 0) {
      setSelectedState(null)
    } else if (selectedState && !states.find(s => s.id === selectedState.id)) {
      // If the selected state ID is no longer in the list, deselect it
      setSelectedState(null)
    }
  }, [states, selectedState])

  // Add this useEffect to keep selectedState synced with the latest data from the states list
  useEffect(() => {
    if (selectedState && states.length > 0) {
      const updatedVersion = states.find(s => s.id === selectedState.id);
      // Only update if the updated version is actually different (shallow compare)
      // to avoid potential infinite loops if object references change but data doesn't.
      // A more robust solution might involve deep comparison or checking a version/timestamp.
      if (updatedVersion && updatedVersion !== selectedState) {
        setSelectedState(updatedVersion);
      }
    }
    // Depend on the 'states' array reference and the selected ID
  }, [states, selectedState?.id])

  if (statesLoading) {
    return <div>Loading states...</div>
  }

  if (statesError) {
    return (
      <div className="text-red-500">
        Error loading states: {statesError.message}
      </div>
    )
  }

  const handleCreateState = (data: CellStateCreate[]) => {
    // Create all states in sequence
    const createNextState = (index: number) => {
      if (index >= data.length) {
        setShowCreateState(false)
        return
      }

      const stateData = data[index]
      createState.mutate(stateData, {
        onSuccess: (newState) => {
          // Create next state
          createNextState(index + 1)
        },
      })
    }

    // Start creating states
    createNextState(0)
  }

  const handleUpdateState = async (stateId: number, formData: { parameters: Record<string, any>, additional_notes?: string }) => {
    try {
      // Destructure parameters and additional_notes from the incoming form data
      const { parameters, additional_notes } = formData;
      
      // Call the mutation with the correct structure
      await updateState.mutateAsync({ 
        id: stateId, 
        parameters, 
        additional_notes 
      });

    } catch (error) {
      console.error('handleUpdateState error', error)
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Cell Culture States</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* States List Column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">States</h2>
            <div className="flex space-x-2">
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={handleExportCSV}
              >
                Export CSV
              </button>
              <button
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                onClick={() => setShowCreateState(true)}
              >
                New State
              </button>
            </div>
          </div>
          
          {showCreateState ? (
            <CreateStateForm
              onSubmit={handleCreateState}
              onCancel={() => setShowCreateState(false)}
              existingStates={states}
            />
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {states.length === 0 ? (
                <div className="p-4 bg-gray-100 rounded-lg text-gray-500">
                  No states found
                </div>
              ) : (
                states.map((state) => (
                  <div
                    key={state.id}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedState?.id === state.id ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedState(state)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{state.name || `State ${state.id}`}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(state.timestamp).toLocaleString()}
                        </div>
                      </div>
                      {selectedState?.id === state.id && (
                        <span className="text-blue-500 text-sm">Selected</span>
                      )}
                    </div>
                    <div className="mt-2 text-sm space-y-1">
                      <div className="flex items-center">
                        <span className="font-medium mr-2">Status:</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          state.parameters.status === 'culturing' ? 'bg-green-100 text-green-800' :
                          state.parameters.status === 'frozen' ? 'bg-blue-100 text-blue-800' :
                          state.parameters.status === 'thawed' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {state.parameters.status || 'N/A'}
                        </span>
                      </div>
                      <div><span className="font-medium">Temp:</span> {state.parameters.temperature_c ?? 'N/A'}°C</div>
                      <div><span className="font-medium">Volume:</span> {state.parameters.volume_ml ?? 'N/A'}ml</div>
                      <div><span className="font-medium">Location:</span> {state.parameters.location || 'N/A'}</div>
                      {state.transition_type && (
                        <div><span className="font-medium">Transition:</span> {state.transition_type}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* State Details / Lineage Column */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">State Lineage & Details</h2>
          {selectedState ? (
            <StateLineage 
              state={selectedState}
              states={states}
              onSelectState={setSelectedState}
              onUpdateState={handleUpdateState}
            />
          ) : (
            <div className="p-4 bg-gray-100 rounded-lg text-gray-500 h-[600px] flex items-center justify-center">
              Select a state from the list to view its details and lineage.
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 