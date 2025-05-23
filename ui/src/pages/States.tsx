import { useState, useEffect } from 'react'
import { useStates, useUpdateState, useCreateState } from '../api'
import { CellState, CellStateCreate } from '../api'
import CreateStateForm from '../components/CreateStateForm'
import StateLineage from '../components/StateLineage'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { calculateMeasuredDoublingTime, formatToSignificantFigures, formatCellDensity } from '../utils/calculations'
import { useQueryClient } from '@tanstack/react-query'
import { useParameters } from '../components/ParameterUtils'
import EditStateModal from '../components/EditStateModal'

dayjs.extend(utc)

// Helper function to calculate and update doubling time for a state
const calculateAndUpdateDoublingTime = async (
  state: CellState, 
  childState: CellState | null,
  updateState: any,
  queryClient: any
) => {
  // Use the new signature of calculateMeasuredDoublingTime which takes a state with both densities
  console.log('Calculating doubling time for state:', state.id);
  
  // Use type casting to any to avoid TypeScript errors with complex state structure
  const measuredDoublingTime = calculateMeasuredDoublingTime(state as any, childState as any);
  
  if (measuredDoublingTime !== null) {
    console.log(`SUCCESS: Calculated doubling time: ${measuredDoublingTime} hours for state ${state.id}`);
    
    try {
      // Update the state with measured doubling time
      await updateState.mutateAsync({ 
        id: state.id, 
        parameters: {
          ...state.parameters,
          measured_doubling_time: measuredDoublingTime
        }
      });
      
      console.log(`SUCCESS: Updated state ${state.id} with doubling time ${measuredDoublingTime}`);
      // Show a simpler alert that won't have formatting issues
      alert(`Doubling time: ${measuredDoublingTime.toFixed(2)} hours`);
      
      // Refresh the states list to show the updated measured doubling time
      queryClient.invalidateQueries({ queryKey: ['states'] });
      return true;
    } catch (error) {
      console.error(`FAILED: Update state ${state.id} with doubling time:`, error);
      return false;
    }
  } else {
    console.warn(`FAILED: Could not calculate measured doubling time for state ${state.id}.`);
    console.log(`Required input missing or invalid`);
    return false;
  }
};

export default function States() {
  const queryClient = useQueryClient()
  const { data: statesData, isLoading: statesLoading, error: statesError, refetch: refetchStates } = useStates()
  const [selectedState, setSelectedState] = useState<CellState | null>(null)
  const [showCreateState, setShowCreateState] = useState(false)
  
  // Move parameter utilities to the top level
  const { isParameterApplicable, getParameterDisplayName } = useParameters();

  // State for prediction modal
  const [predictingStateId, setPredictingStateId] = useState<number | null>(null);
  const [predictionTimeInput, setPredictionTimeInput] = useState<string>('');
  const [predictionResult, setPredictionResult] = useState<string | null>(null);

  // Use the basic useCreateState hook to avoid duplicate-prevention logic interfering with split submissions
  const { mutateAsync: createStateMutateAsync } = useCreateState()
  const updateState = useUpdateState()

  // Ensure states are always arrays
  const [states, setStates] = useState<CellState[]>([]); // Manage states locally

  // State for editing a state
  const [editingState, setEditingState] = useState<CellState | null>(null);

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
      // Use full URL to bypass any routing issues
      const apiUrl = `${import.meta.env.VITE_API_BASE || ''}/api/export/csv`;
      
      // Fetch the CSV data from the backend
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv,*/*'
        }
      });
      
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
       setPredictionResult(formatCellDensity(n0)); // Density doesn't change
       return;
    }

    // Calculate predicted density: N(t) = N0 * exp(r * dt)
    const predictedDensity = n0 * Math.exp(growthRate * deltaTimeHours);

    setPredictionResult(formatCellDensity(predictedDensity));
  };

  // Function to handle direct calculation of doubling time from a state with end_density
  const handleCalculateDoublingTime = (state: CellState) => {
    // Find the relevant child state if any (for timestamps)
    const childStates = states.filter(s => s.parent_id === state.id);
    const firstChildState = childStates.length > 0 
      ? childStates.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0]
      : null;
    
    // Calculate doubling time for this state if it has both densities
    calculateAndUpdateDoublingTime(state, firstChildState, updateState, queryClient)
      .then(success => {
        if (!success) {
          alert('Could not calculate doubling time. Make sure the state has both initial cell density and end density values.');
        }
      });
  };

  // Function to handle editing a state from any view
  const handleEditState = (state: CellState) => {
    setEditingState(state);
  };

  // Function to close the edit modal
  const handleCloseEditModal = () => {
    setEditingState(null);
  };

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
      
      // Process state data before creation
      if (stateData.parent_id) {
        const parentState = states.find(s => s.id === stateData.parent_id);
        
        // Calculate measured doubling time if we have end density information
        if (parentState && 
            parentState.parameters?.cell_density && 
            stateData.parameters?.transition_parameters?.parent_end_density) {
          
          console.log(`DOUBLING TIME CALCULATION - Creating child state:
            - Parent ID: ${parentState.id}
            - Parent name: ${parentState.name}
            - Initial density: ${parentState.parameters.cell_density}
            - Final density: ${stateData.parameters.transition_parameters.parent_end_density}
            - Start time: ${parentState.timestamp}
            - End time: ${stateData.timestamp}`);
          
          // Create the state first so we have a complete child state to work with
          createStateMutateAsync(stateData).then(
            (createdChild) => {
              // Find the newly created child state
              const childState = createdChild || states.find(s => 
                s.parent_id === parentState.id && s.timestamp === stateData.timestamp
              );
              
              // Calculate doubling time for the parent
              calculateAndUpdateDoublingTime(parentState, childState, updateState, queryClient)
                .then(() => {
                  // Continue with next state creation
                  createNextState(index + 1);
                });
            },
            (error) => {
              console.error('handleCreateState error', error);
              // Continue even if there was an error
              createNextState(index + 1);
            }
          );
        } else {
          console.log(`SKIPPED: Doubling time calculation - missing required data:
            parentState: ${!!parentState}
            parent_id: ${stateData.parent_id}
            parent cell_density: ${!!parentState?.parameters?.cell_density}
            child parent_end_density: ${!!stateData.parameters?.transition_parameters?.parent_end_density}`);
          
          // Just create the state without doubling time calculation
          createStateMutateAsync(stateData).then(
            () => {
              createNextState(index + 1);
            },
            (error) => {
              console.error('handleCreateState error', error);
              createNextState(index + 1);
            }
          );
        }
      } else {
        // No parent ID means a new root state, just create it
        createStateMutateAsync(stateData).then(
          () => {
            createNextState(index + 1);
          },
          (error) => {
            console.error('handleCreateState error', error);
            createNextState(index + 1);
          }
        );
      }
    }

    // Start creating states
    createNextState(0)
  }

  const handleUpdateState = async (stateId: number, formData: { parameters: Record<string, any>, additional_notes?: string }) => {
    try {
      // Destructure parameters and additional_notes from the incoming form data
      const { parameters, additional_notes } = formData;
      
      // Find the state and its parent to calculate measured doubling time
      const stateToUpdate = states.find(s => s.id === stateId);
      if (stateToUpdate && stateToUpdate.parent_id) {
        const parentState = states.find(s => s.id === stateToUpdate.parent_id);
        
        // If parent has cell density and this state has parent_end_density in its transition_parameters
        if (parentState && 
            parentState.parameters?.cell_density && 
            parameters.transition_parameters?.parent_end_density) {
          
          console.log(`DOUBLING TIME CALCULATION - Updating state:
            - Parent ID: ${parentState.id}
            - Parent name: ${parentState.name}
            - Initial density: ${parentState.parameters.cell_density}
            - Final density: ${parameters.transition_parameters.parent_end_density}
            - Start time: ${parentState.timestamp}
            - End time: ${stateToUpdate.timestamp}`);
          
          // First update the state with new parameters
          await updateState.mutateAsync({
            id: stateId,
            parameters,
            additional_notes
          });
          
          // Re-fetch the state we just updated to ensure we have latest data
          await queryClient.invalidateQueries({ queryKey: ['states'] });
          
          // Get the refreshed states and find the updated state
          const refreshedStates = queryClient.getQueryData(['states']) as CellState[];
          const updatedState = refreshedStates?.find(s => s.id === stateId);
          
          if (updatedState) {
            // Calculate doubling time for the parent using updated state
            await calculateAndUpdateDoublingTime(parentState, updatedState, updateState, queryClient);
          }
        } else {
          console.log(`SKIPPED: Doubling time calculation on update - missing required data:
            parentState: ${!!parentState}
            parent_id: ${stateToUpdate.parent_id}
            parent cell_density: ${!!parentState?.parameters?.cell_density}
            child parent_end_density: ${!!parameters.transition_parameters?.parent_end_density}`);
            
          // Just update the state without doubling time calculation
          await updateState.mutateAsync({ 
            id: stateId, 
            parameters, 
            additional_notes 
          });
          
          // Invalidate states query 
          queryClient.invalidateQueries({ queryKey: ['states'] });
        }
      } else {
        // No parent or no parent ID, just update the state
        await updateState.mutateAsync({ 
          id: stateId, 
          parameters, 
          additional_notes 
        });
        
        // Invalidate states query
        queryClient.invalidateQueries({ queryKey: ['states'] });
      }
    } catch (error) {
      console.error('handleUpdateState error', error)
    }
  }

  // Find the state object for the modal
  const stateForModal = states.find(s => s.id === predictingStateId);

  return (
    <div className="space-y-6 p-0 md:p-0 lg:p-0">
      {/* Instructions Section Start */}
      <details className="bg-sky-50 border border-sky-200 rounded-lg p-4 mb-6 shadow">
        <summary className="font-semibold text-xl cursor-pointer text-sky-700 hover:text-sky-900 focus:outline-none">How to Use This Tool</summary>
        <div className="mt-3 text-base text-gray-700 space-y-2">
          <p><strong>Purpose:</strong> Track cell culture lineage, growth parameters, and calculate doubling times.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <p className="font-medium text-blue-700 text-base">Basic Operations:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>View cultures in the graph or list views</li>
                <li>Click on any state to see details and edit it</li>
                <li>Use "New State" to add a new culture</li>
                <li>Export all data using "Export CSV"</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-blue-700 text-base">Cell Management:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Create new culture: Select "New State" without a parent</li>
                <li>Passage cells: Select "New State" with a parent</li>
                <li>Record measurements by creating a measurement state</li>
                <li>Freeze/thaw operations track storage location</li>
              </ul>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <p className="font-medium text-blue-700 text-base">Growth Analysis:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Click "Calculate Doubling Time" on a state with both cell_density and end_density</li>
                <li>Doubling time is automatically calculated when adding child states</li>
                <li>Use "Predict Density" to project future cell counts</li>
                <li>View growth parameters in state details</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-blue-700 text-base">View Options:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Process view: Shows visual workflow</li>
                <li>List view: Shows hierarchical relationship</li>
                <li>Graph view: Shows the cell lineage tree</li>
                <li>Raw list: Displays all parameters in a table</li>
              </ul>
            </div>
          </div>
          
          <p className="text-xs text-right mt-2 italic">Last updated: May 1, 2024</p>
        </div>
      </details>
      {/* Instructions Section End */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* States List Column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-700">States</h2>
            <div className="flex space-x-2">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm transition-colors"
                onClick={handleExportCSV}
              >
                Export CSV
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 shadow-sm transition-colors"
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
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-4">
              {states.length === 0 ? (
                <div className="p-4 bg-gray-100 rounded-lg text-gray-500 text-center">
                  No states found
                </div>
              ) : (
                states.map((state) => {
                  // Determine operation type
                  const operationType = state.parameters?.transition_parameters?.operation_type;
                  
                  // Use parameter utilities from context (already defined at top level)
                  // const { isParameterApplicable, getParameterDisplayName } = useParameters();
                  
                  // Function to render a parameter value with proper NA handling
                  const renderParameterValue = (paramKey: string, value: any) => {
                    if (!isParameterApplicable(paramKey, operationType)) {
                      return <span className="text-gray-400 italic">N/A</span>;
                    }
                    if (value === undefined || value === null) {
                      return <span className="text-yellow-500">-</span>;
                    }
                    
                    // Format different types of values appropriately
                    if (typeof value === 'number') {
                      if (paramKey === 'growth_rate') {
                        return formatToSignificantFigures(value);
                      } else if (paramKey === 'doubling_time' || paramKey === 'measured_doubling_time') {
                        return formatToSignificantFigures(value);
                      } else if (paramKey === 'density_limit' || paramKey === 'cell_density' || 
                                paramKey === 'parent_end_density' || paramKey === 'end_density') {
                        return formatCellDensity(value);
                      }
                      return formatToSignificantFigures(value);
                    }
                    
                    return String(value);
                  };
                  
                  return (
                    <div
                      key={state.id}
                      className={`p-4 mb-4 rounded-lg border ${
                        selectedState?.id === state.id 
                          ? 'bg-blue-50 border-blue-400 shadow-md scale-[1.01]' 
                          : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      } cursor-pointer transition-all duration-150 ease-in-out overflow-visible`}
                      onClick={() => setSelectedState(state)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-gray-800">{state.name || `State ${state.id}`}</div>
                          <div className="text-sm text-gray-500">
                            {dayjs.utc(state.timestamp).local().format('DD/MM/YYYY, HH:mm:ss')}
                          </div>
                        </div>
                        {selectedState?.id === state.id && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Selected</span>
                        )}
                      </div>
                      
                      {/* Display operation type prominently if available */}
                      {operationType && (
                        <div className="mt-2 mb-2 text-xs inline-block bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full font-medium">
                          {operationType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </div>
                      )}
                      
                      <div className="mt-2 text-sm space-y-1 text-gray-700">
                        {/* Show cell type, checking both direct and transition parameters */}
                        {(isParameterApplicable('cell_type', operationType)) && (
                          <div>
                            <span className="font-medium">{getParameterDisplayName('cell_type')}:</span> 
                            {renderParameterValue('cell_type', state.parameters?.cell_type || state.parameters?.transition_parameters?.cell_type)}
                          </div>
                        )}
                      </div>
                      
                      {/* Buttons section */}
                      <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); // Prevent state selection when clicking button
                            handleOpenPredictModal(state.id); 
                          }}
                          className="text-xs px-3 py-1.5 rounded-md shadow-sm bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                        >
                          Predict
                        </button>
                        
                        {/* Edit button */}
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); // Prevent state selection when clicking button
                            handleEditState(state); 
                          }}
                          className="text-xs px-3 py-1.5 rounded-md shadow-sm bg-sky-500 text-white hover:bg-sky-600 transition-colors"
                        >
                          Edit
                        </button>
                        
                        {/* Only show calculate button if the state has cell_density */}
                        {state.parameters?.cell_density && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); // Prevent state selection when clicking button
                              handleCalculateDoublingTime(state); 
                            }}
                            className="text-xs px-3 py-1.5 rounded-md shadow-sm bg-teal-500 text-white hover:bg-teal-600 transition-colors"
                          >
                            Doubling Time
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* State Details / Lineage Column */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">State Lineage</h2>
          {!showCreateState && selectedState && (
            <StateLineage 
              state={selectedState} 
              states={states} 
              onSelectState={handleSelectState}
              onUpdateState={handleUpdateState}
              onStatesChange={setStates}
              isUpdating={updateState.isPending}
              updateError={updateState.error?.message}
              onEditState={handleEditState}
              hideTitle={true}
            />
          )}
        </div>
      </div>

      {/* Footer with credit */}
      <div className="mt-12 pt-6 border-t border-gray-300 text-center text-sm text-gray-600">
        Culture Tracker built by Lichi Fang
      </div>

      {/* Edit State Modal */}
      <EditStateModal
        isOpen={editingState !== null}
        state={editingState}
        onClose={handleCloseEditModal}
        onSubmit={async (stateId, formData) => {
          try {
            await handleUpdateState(stateId, formData);
            // Close the modal only after successful update
            setEditingState(null);
          } catch (error) {
            console.error('Error in edit modal submit:', error);
            // Modal will stay open if there's an error
          }
        }}
        isUpdating={updateState.isPending}
        updateError={updateState.error?.message || null}
      />

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
            <h3 className="text-xl leading-6 font-semibold text-gray-900">Predict Cell Density</h3>
            <div className="mt-3 text-sm text-gray-600 space-y-1">
              Predicting for <strong>{stateForModal.name || `State ${stateForModal.id}`}</strong> <br/>
              Initial Time: {dayjs.utc(stateForModal.timestamp).local().format('DD/MM/YYYY, HH:mm')} <br/>
              Initial Density: {formatCellDensity(stateForModal.parameters?.cell_density)} million cells/ml <br/>
              Growth Rate (g): {formatToSignificantFigures(stateForModal.parameters?.growth_rate, 'N/A')} /hr 
              (Doubling Time (DT): {formatToSignificantFigures(stateForModal.parameters?.doubling_time, 'N/A')} hr)
              {stateForModal.parameters?.measured_doubling_time && (
                <><br/>Measured DT: <span className="font-semibold">{formatToSignificantFigures(stateForModal.parameters.measured_doubling_time)} hr</span></>
              )}
            </div>
            <div className="mt-4">
              <label htmlFor="predictionTime" className="block text-sm font-medium text-gray-700 mb-1">
                Predict density at time:
              </label>
              <input
                id="predictionTime"
                type="datetime-local"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={predictionTimeInput}
                onChange={handlePredictionTimeChange}
              />
            </div>
            <div className="mt-6">
              <button 
                onClick={handleCalculatePrediction}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Calculate Prediction
              </button>
            </div>
            {predictionResult !== null && (
              <div className={`mt-4 p-3 rounded-md text-sm ${predictionResult.startsWith('Error:') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {predictionResult.startsWith('Error:') ? predictionResult : <>Predicted Density: <span className="font-semibold">{predictionResult}</span> million cells/ml</>}
              </div>
            )}
             <div className="mt-6 text-right">
               <button 
                 onClick={handleClosePredictModal}
                 className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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