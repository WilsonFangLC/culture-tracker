import { CellState } from '../api'
import LineageGraph from './LineageGraph'
import { useState, useEffect } from 'react'
import EditStateForm from './EditStateForm'

interface StateLineageProps {
  state: CellState | null;
  states: CellState[];
  onSelectState: (state: CellState) => void;
  onUpdateState: (stateId: number, parameters: any) => void;
  isUpdating?: boolean;
  updateError?: string;
}

export default function StateLineage({ 
  state, 
  states, 
  onSelectState, 
  onUpdateState,
  isUpdating,
  updateError 
}: StateLineageProps) {
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('graph')
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
            Graph View
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
              await onUpdateState(editingState.id, data.parameters)
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
      ) : viewMode === 'graph' ? (
        <LineageGraph
          state={state}
          states={states}
          onSelectState={onSelectState}
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(generations).length > 0 ? (
            Object.entries(generations).map(([generation, states]) => (
              <div key={generation} className="flex flex-wrap gap-4">
                {states.map((s) => {
                  const siblings = getSiblings(s);
                  const isSplitTransition = siblings.length > 1;
                  
                  return (
                    <div
                      key={s.id}
                      className={`flex-1 min-w-[200px] p-3 rounded ${
                        s.id === state?.id ? 'bg-blue-50 ring-2 ring-blue-400' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{s.name || `State ${s.id}`}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                          Status {s.parameters?.status || 'N/A'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(s.timestamp).toLocaleString()}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                        <div>ID: {s.id}</div>
                        <div>Temp: {s.parameters?.temperature_c ?? 'N/A'}°C | Vol: {s.parameters?.volume_ml ?? 'N/A'}ml</div>
                        <div>Location: {s.parameters?.location ?? 'N/A'}</div>
                        <div>Cell Density: {s.parameters?.cell_density ?? 'N/A'} cells/ml | Viability: {s.parameters?.viability ?? 'N/A'}%</div>
                        {s.parameters?.storage_location && (
                           <div>Storage: {s.parameters.storage_location}</div>
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