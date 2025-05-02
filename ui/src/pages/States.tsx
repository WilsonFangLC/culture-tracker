import { useState, useEffect } from 'react'
import { useStates, useCreateState, useUpdateState } from '../api'
import { CellState, CellStateCreate } from '../api'
import CreateStateForm from '../components/CreateStateForm'
import StateLineage from '../components/StateLineage'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

// Helper function to format prediction results
function formatPrediction(value: number | null): string {
  if (value === null || !isFinite(value)) return 'N/A';
  return value.toExponential(2);
}

export default function States() {
  const { data: statesData, isLoading: statesLoading, error: statesError } = useStates()
  const [selectedState, setSelectedState] = useState<CellState | null>(null)
  const [showCreateState, setShowCreateState] = useState(false)

  // State for prediction modal
  const [predictingStateId, setPredictingStateId] = useState<number | null>(null);
  const [predictionTimeInput, setPredictionTimeInput] = useState<string>('');
  const [predictionResult, setPredictionResult] = useState<string | null>(null);

  const createState = useCreateState()
  const updateState = useUpdateState()

  // Ensure states are always arrays
  const [states, setStates] = useState<CellState[]>([]); // Manage states locally

  // --- Update local states when API data changes ---
  useEffect(() => {
    if (statesData && Array.isArray(statesData)) {
      setStates(statesData);
    }
  }, [statesData]);
  // --- End update effect ---

  // --- Define handleSelectState --- 
  const handleSelectState = (state: CellState | null) => {
    setSelectedState(state);
  };
  // --- End handleSelectState --- 

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

  // --- Prediction Handlers ---
  const handleOpenPredictModal = (stateId: number) => {
    // Set default prediction time to 1 day after the state's timestamp
    const state = states.find(s => s.id === stateId);
    if (state) {
      const defaultPredTime = dayjs.utc(state.timestamp).add(1, 'day').local().format('YYYY-MM-DDTHH:mm');
      setPredictionTimeInput(defaultPredTime);
    }
    setPredictingStateId(stateId);
    setPredictionResult(null); // Reset result when opening
  };

  const handleClosePredictModal = () => {
    setPredictingStateId(null);
    setPredictionTimeInput('');
    setPredictionResult(null);
  };

  const handlePredictionTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPredictionTimeInput(event.target.value);
  };

  const handleCalculatePrediction = () => {
    const state = states.find(s => s.id === predictingStateId);
    if (!state) {
      setPredictionResult('Error: State not found');
      return;
    }

    const { parameters, timestamp } = state;
    const n0 = parameters?.cell_density;
    let growthRate = parameters?.growth_rate;
    const doublingTime = parameters?.doubling_time;
    const stateTime = dayjs.utc(timestamp); // State time in UTC
    const predictionTimeLocal = dayjs(predictionTimeInput); // Input time is local

    if (!predictionTimeLocal.isValid()) {
      setPredictionResult('Error: Invalid prediction date/time format.');
      return;
    }
    
    const predictionTimeUtc = predictionTimeLocal.utc(); // Convert prediction time to UTC for comparison

    if (predictionTimeUtc.isBefore(stateTime) || predictionTimeUtc.isSame(stateTime)) {
       setPredictionResult("Error: Prediction time must be after the state's time.");
       return;
    }

    if (typeof n0 !== 'number') {
      setPredictionResult('Error: Missing initial cell density.');
      return;
    }

    // Calculate growth rate if not available but doubling time is
    if (typeof growthRate !== 'number' || growthRate === null) {
       if (typeof doublingTime === 'number' && doublingTime > 0) {
           growthRate = Math.log(2) / doublingTime;
       } else {
           setPredictionResult('Error: Missing Growth Rate or valid Doubling Time.');
           return;
       }
    } else if (growthRate < 0) {
        // Negative growth rate implies decay, which is fine
        // If 0, density remains n0
    }

    // Calculate time difference in hours (assuming growth rate is per hour)
    const deltaTimeMs = predictionTimeUtc.diff(stateTime); // Difference in milliseconds
    const deltaTimeHours = deltaTimeMs / (1000 * 60 * 60); 

    if (growthRate === 0) {
       setPredictionResult(formatPrediction(n0)); // Density doesn't change
       return;
    }

    // Calculate predicted density: N(t) = N0 * exp(r * dt)
    const predictedDensity = n0 * Math.exp(growthRate * deltaTimeHours);

    setPredictionResult(formatPrediction(predictedDensity));
  };
  // --- End Prediction Handlers ---

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
        onSuccess: (/* newState */) => { // Commented out unused variable
          // Create next state
          createNextState(index + 1)
        },
        onError: (error) => {
          console.error('handleCreateState error', error)
        }
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

  // Find the state object for the modal
  const stateForModal = states.find(s => s.id === predictingStateId);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Cell Culture States</h1>

      {/* Instructions Section Start */}
      <details className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 shadow-sm">
        <summary className="font-semibold text-lg cursor-pointer text-blue-700 hover:text-blue-900">How to Use This Tool</summary>
        <div className="mt-3 text-sm text-gray-700 space-y-2">
          <p><strong>Purpose:</strong> This tool helps you track the lineage and passage number of your cell cultures.</p>
          <p><strong>Viewing Cells:</strong> The lineage graph below shows your cell states. Each box represents a specific culture or passage. Click on a box to see its details on the right.</p>
          <p><strong>Adding a New Culture:</strong> To add a brand new cell line (with no parent), use the 'Create New State' button or form, leave the 'Parent State' selection empty, and fill in the other details.</p>
          <p><strong>Passaging Cells (Adding a Child):</strong> To record a new passage derived from an existing one:
            <ol className="list-decimal list-inside ml-4">
              <li>Use the 'Create New State' button or form.</li>
              <li>Select the ID of the parent cell state (the one you passaged *from*) in the 'Parent State' selection.</li>
              <li>Fill in the details for the *new* passage (name, passage number, date, etc.).</li>
              <li>Submit the form. The new passage will appear connected to its parent in the lineage graph.</li>
            </ol>
          </p>
          <p><strong>Deleting a Cell State:</strong> Click the 'Delete' button on a cell state's details view. <strong className="text-red-600">Important:</strong> You can only delete a cell state if it has *no children* (i.e., you haven't passaged anything *from* it yet).</p>
          <p><strong>Editing Details:</strong> Click on a cell state in the graph, then use the form on the right to update its parameters or notes.</p>
          <p><strong>Predicting Density:</strong> Click the 'Predict Density' button on a cell state's details to estimate cell density at a future time point based on its recorded parameters.</p>
           <p><strong>Exporting Data:</strong> Use the 'Export CSV' button to download all cell state data.</p>
          
        </div>
      </details>
      {/* Instructions Section End */}

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
                          {dayjs.utc(state.timestamp).local().format('DD/MM/YYYY, HH:mm:ss')}
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
                      {/* Growth Rate / Doubling Time Display */}
                      {state.parameters.growth_rate !== undefined && (
                        <div><span className="font-medium">Growth Rate:</span> {state.parameters.growth_rate?.toFixed(4) ?? 'N/A'} (per hour)</div>
                      )}
                      {state.parameters.doubling_time !== undefined && (
                        <div><span className="font-medium">Doubling Time:</span> {state.parameters.doubling_time?.toFixed(2) ?? 'N/A'} (hours)</div>
                      )}
                      {state.parameters.density_limit !== undefined && state.parameters.density_limit !== null && (
                         <div><span className="font-medium">Density Limit:</span> {formatPrediction(state.parameters.density_limit)} (cells/mL)</div>
                      )}
                      {state.transition_type && (
                        <div><span className="font-medium">Transition:</span> {state.transition_type}</div>
                      )}
                    </div>
                    {/* Prediction Button */} 
                    <div className="mt-2 pt-2 border-t border-gray-200">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); // Prevent state selection when clicking button
                            handleOpenPredictModal(state.id); 
                          }}
                          className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                        >
                            Predict Density...
                        </button>
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
          {!showCreateState && selectedState && (
            <StateLineage 
              state={selectedState} 
              states={states} 
              onSelectState={handleSelectState} 
              onUpdateState={handleUpdateState}
              onStatesChange={setStates} // Pass the state setter
              isUpdating={updateState.isPending} // Use isPending for loading status
              updateError={updateState.error?.message} // Pass error message
            />
          )}
        </div>
      </div>

      {/* Prediction Modal */} 
      {predictingStateId !== null && stateForModal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center"
          onClick={handleClosePredictModal} // Close on overlay click
        >
          <div 
            className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            <h3 className="text-lg leading-6 font-medium text-gray-900">Predict Cell Density</h3>
            <div className="mt-2 text-sm text-gray-600">
              Predicting from State {stateForModal.id} ({stateForModal.name || 'Unnamed'}) <br/>
              Initial Time: {dayjs.utc(stateForModal.timestamp).local().format('DD/MM/YYYY, HH:mm')} <br/>
              Initial Density: {formatPrediction(stateForModal.parameters?.cell_density)} cells/mL <br/>
              Growth Rate: {stateForModal.parameters?.growth_rate?.toFixed(4) ?? 'N/A'} /hr (or Doubling Time: {stateForModal.parameters?.doubling_time?.toFixed(2) ?? 'N/A'} hr)
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Predict density at time:
              </label>
              <input
                type="datetime-local"
                className="mt-1 w-full p-2 border rounded"
                value={predictionTimeInput}
                onChange={handlePredictionTimeChange}
              />
            </div>
            <div className="mt-4">
              <button 
                onClick={handleCalculatePrediction}
                className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              >
                Calculate
              </button>
            </div>
            {predictionResult !== null && (
              <div className={`mt-4 p-3 rounded ${predictionResult.startsWith('Error:') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {predictionResult.startsWith('Error:') ? predictionResult : `Predicted Density: ${predictionResult} cells/mL`}
              </div>
            )}
             <div className="mt-4 text-right">
               <button 
                 onClick={handleClosePredictModal}
                 className="text-sm text-gray-500 hover:text-gray-700"
               >
                 Close
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 