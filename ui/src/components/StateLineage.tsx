import { CellState, deleteCellState } from '../api'
import LineageGraph from './LineageGraph'
import ProcessGraph from './ProcessGraph'
import { useState, useEffect, useCallback } from 'react'
import EditStateForm from './EditStateForm'
import { calculatePredictedDensity } from '../utils/calculations'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)

interface StateLineageProps {
  state: CellState | null;
  states: CellState[];
  onSelectState: (state: CellState | null) => void;
  onUpdateState: (stateId: number, updateData: { parameters: any; additional_notes?: string }) => void;
  onStatesChange: (states: CellState[]) => void;
  isUpdating?: boolean;
  updateError?: string;
}

export default function StateLineage({ 
  state, 
  states, 
  onSelectState, 
  onUpdateState,
  onStatesChange,
  isUpdating,
  updateError 
}: StateLineageProps) {
  const [viewMode, setViewMode] = useState<'list' | 'graph' | 'process-graph'>('process-graph')
  const [editingState, setEditingState] = useState<CellState | null>(null)

  // Sync editingState if the state prop updates after an update
  useEffect(() => {
    if (editingState && state && editingState.id === state.id) {
      setEditingState(state)
    }
  }, [state, editingState])

  // Find all ancestors
  const getAncestors = (currentState: CellState | null): CellState[] => {
    if (!currentState) return [];
    if (!currentState.parent_id) return [currentState];
    const parent = states.find(s => s.id === currentState.parent_id);
    if (!parent) return [currentState];
    return [...getAncestors(parent), currentState];
  };

  // Find all descendants
  const getDescendants = (currentState: CellState | null): CellState[] => {
    if (!currentState) return [];
    const children = states.filter(s => s.parent_id === currentState.id);
    if (children.length === 0) return [currentState];
    return [currentState, ...children.flatMap(child => getDescendants(child))];
  };

  const lineage = state ? [...getAncestors(state), ...getDescendants(state).slice(1)] : [];
  const uniqueLineage = Array.from(new Set(lineage.map(s => s.id))).map(id => 
    lineage.find(s => s.id === id)
  ).filter((s): s is CellState => s !== undefined);

  // Group states by generation (distance from root)
  const generations = uniqueLineage.reduce((acc, state) => {
    if (!state) return acc;
    let distance = 0;
    let current = state;
    while (current.parent_id) {
      distance++;
      const parent = states.find(s => s.id === current.parent_id);
      if (!parent) break;
      current = parent;
    }
    if (!acc[distance]) acc[distance] = [];
    acc[distance].push(state);
    return acc;
  }, {} as Record<number, CellState[]>);

  // Find siblings (states with the same parent)
  const getSiblings = (state: CellState | null) => {
    if (!state?.parent_id) return state ? [state] : [];
    return states.filter(s => s.parent_id === state.parent_id);
  };

  const handleAddNote = (stateId: number, notes: string) => {
    console.log(`Adding note to state ${stateId}:`, notes);
    const stateToUpdate = states.find(s => s.id === stateId);
    if (stateToUpdate) {
       // Call the prop function passed down, ensuring parameters are included
      onUpdateState(stateId, { parameters: stateToUpdate.parameters, additional_notes: notes });
      // Or if using the mutation hook directly:
      // updateState.mutate({ id: stateId, parameters: stateToUpdate.parameters, additional_notes: notes });
    } else {
      console.error("State not found for adding note:", stateId);
    }
  };

  // const isSplitTransition = selectedState?.transition_type === 'split'; // Commented out: Unused variable

  // Function to initiate prediction
  const handlePredictClick = (stateId: number) => {
    // ... existing code ...
  };

  const handleDeleteState = useCallback(async (stateId: number) => {
    try {
      await deleteCellState(stateId);
      // Update local state by removing the deleted state
      const updatedStates = states.filter(s => s.id !== stateId);
      onStatesChange(updatedStates); // Notify parent component
      // Optionally, if the currently selected state was deleted, clear the selection
      if (state?.id === stateId) {
        onSelectState(null); // Assuming onSelectState(null) deselects
      }
    } catch (error: any) {
      console.error("Failed to delete state:", error);
      if (error.response && error.response.status === 409) {
        // Specific error for conflict (state has children)
        window.alert("Error: Cannot delete state with children. Please delete descendants first.");
      } else if (error.response && error.response.status === 404) {
        // Specific error for not found 
        window.alert("Error: State not found.");
        // Optionally remove from local state if API confirms not found
         onStatesChange(states.filter(s => s.id !== stateId));
      } else {
        // Generic error message
        window.alert(`Failed to delete state. ${error.message || 'Please try again.'}`);
      }
    }
  }, [states, state, onStatesChange, onSelectState]);

  return (
    <div className="mt-4 p-4 bg-white rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">State Lineage</h3>
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 rounded ${
              viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
            }`}
            onClick={() => setViewMode('list')}
          >
            List View
          </button>
          <button
            className={`px-3 py-1 rounded ${
              viewMode === 'graph' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
            }`}
            onClick={() => setViewMode('graph')}
          >
            State Graph
          </button>
          <button
            className={`px-3 py-1 rounded ${
              viewMode === 'process-graph' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
            }`}
            onClick={() => setViewMode('process-graph')}
          >
            Process Graph
          </button>
        </div>
      </div>

      {editingState ? (
        <div className="space-y-4">
          {updateError && (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg">
              Error updating state: {updateError}
            </div>
          )}
          <EditStateForm
            state={editingState}
            onSubmit={async (data) => {
              // Perform the update and wait for completion
              await onUpdateState(editingState.id, data)
              // Close the edit form once update succeeds
              setEditingState(null)
            }}
            onCancel={() => setEditingState(null)}
          />
          {isUpdating && (
            <div className="p-4 bg-blue-50 text-blue-700 rounded-lg">
              Saving changes...
            </div>
          )}
        </div>
      ) : viewMode === 'process-graph' ? (
        <ProcessGraph
          state={state}
          states={states}
          onSelectState={onSelectState}
          onDeleteState={handleDeleteState}
        />
      ) : viewMode === 'graph' ? (
        <LineageGraph
          state={state}
          states={states}
          onSelectState={onSelectState}
          onDeleteState={handleDeleteState}
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(generations).length > 0 ? (
            Object.entries(generations).map(([generation, states]) => (
              <div key={generation} className="flex flex-wrap gap-4">
                {states.map((s) => {
                  const siblings = getSiblings(s);
                  // const isSplitTransition = siblings.length > 1; // Commented out: Unused variable
                  
                  return (
                    <div
                      key={s.id}
                      className={`flex-1 min-w-[200px] p-3 rounded ${
                        s.id === state?.id ? 'bg-blue-50 ring-2 ring-blue-400' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{s.name || `State ${s.id}`}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {dayjs.utc(s.timestamp).local().format('DD/MM/YYYY, HH:mm:ss')}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                        <div>ID: {s.id}</div>
                        {s.transition_type && (
                           <div className="capitalize font-medium text-blue-700">Type: {s.transition_type}</div>
                        )}
                        <div><span className="font-medium">Temp:</span> {s.parameters?.temperature_c ?? 'N/A'}°C</div>
                        <div><span className="font-medium">Volume:</span> {s.parameters?.volume_ml ?? 'N/A'}ml</div>
                        <div><span className="font-medium">Location:</span> {s.parameters?.location ?? 'N/A'}</div>
                        <div>Cell Density: {s.parameters?.cell_density ?? 'N/A'} cells/ml | Viability: {s.parameters?.viability ?? 'N/A'}%</div>
                        {s.parameters?.growth_rate !== undefined && s.parameters?.growth_rate !== null && (
                          <div><span className="font-medium">Growth Rate:</span> {s.parameters.growth_rate} (per hour)</div>
                        )}
                        {s.parameters?.density_limit !== undefined && s.parameters?.density_limit !== null && (
                          <div><span className="font-medium">Density Limit:</span> {s.parameters.density_limit} (cells/mL)</div>
                        )}
                        {(() => {
                          const predicted = calculatePredictedDensity(
                            s.parameters?.cell_density,
                            s.parameters?.growth_rate,
                            s.parameters?.density_limit,
                            s.timestamp
                          );
                          return (
                            <div className="text-green-700">
                              Predicted Density (now): {predicted !== null ? predicted.toExponential(2) : 'N/A'}
                            </div>
                          );
                        })()}
                        {s.parameters?.storage_location && (
                           <div>Storage: {s.parameters.storage_location}</div>
                        )}
                        {s.additional_notes && (
                          <div className="mt-1 pt-1 border-t border-gray-200">
                            <span className="font-semibold">Notes:</span> {s.additional_notes}
                          </div>
                        )}
                      </div>
                      {s.parent_id && (
                        <div className="text-xs text-gray-400 mt-1">
                          {(() => {
                            const parent = states.find(p => p.id === s.parent_id);
                            const parentName = parent?.name || `State ${s.parent_id}`;
                            return `← Parent: ${parentName}`;
                          })()}
                        </div>
                      )}
                      <div className="mt-2 flex justify-end space-x-2">
                        <button
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                          onClick={() => onSelectState(s)}
                        >
                          Select
                        </button>
                        <button
                          className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                          onClick={() => setEditingState(s)}
                        >
                          Edit
                        </button>
                        {/* Add Delete Button for List View */}
                        <button 
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600" 
                          onClick={() => handleDeleteState(s.id)}
                        >
                          Delete
                        </button>
                        {/* End Delete Button */}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500">
              No lineage data available
            </div>
          )}
        </div>
      )}
    </div>
  );
} 