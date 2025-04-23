import { CellState } from '../api'
import LineageGraph from './LineageGraph'
import { useState } from 'react'

interface StateLineageProps {
  state: CellState;
  states: CellState[];
  onSelectState: (state: CellState) => void;
}

export default function StateLineage({ state, states, onSelectState }: StateLineageProps) {
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('graph')

  // Find all ancestors
  const getAncestors = (currentState: CellState): CellState[] => {
    if (!currentState.parent_id) return [currentState];
    const parent = states.find(s => s.id === currentState.parent_id);
    if (!parent) return [currentState];
    return [...getAncestors(parent), currentState];
  };

  // Find all descendants
  const getDescendants = (currentState: CellState): CellState[] => {
    const children = states.filter(s => s.parent_id === currentState.id);
    if (children.length === 0) return [currentState];
    return [currentState, ...children.flatMap(getDescendants)];
  };

  const lineage = [...getAncestors(state), ...getDescendants(state).slice(1)];
  const uniqueLineage = Array.from(new Set(lineage.map(s => s.id))).map(id => 
    lineage.find(s => s.id === id)
  ).filter((s): s is CellState => s !== undefined);

  // Group states by generation (distance from root)
  const generations = uniqueLineage.reduce((acc, state) => {
    let distance = 0;
    let current = state;
    while (current.parent_id) {
      distance++;
      current = states.find(s => s.id === current.parent_id)!;
    }
    if (!acc[distance]) acc[distance] = [];
    acc[distance].push(state);
    return acc;
  }, {} as Record<number, CellState[]>);

  // Find siblings (states with the same parent)
  const getSiblings = (state: CellState) => {
    if (!state.parent_id) return [state];
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

      {viewMode === 'graph' ? (
        <LineageGraph
          state={state}
          states={states}
          onSelectState={onSelectState}
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(generations).map(([generation, states]) => (
            <div key={generation} className="flex flex-wrap gap-4">
              {states.map((s) => {
                const siblings = getSiblings(s);
                const isSplitTransition = siblings.length > 1;
                
                return (
                  <div
                    key={s.id}
                    className={`flex-1 min-w-[200px] p-3 rounded ${
                      s.id === state.id ? 'bg-blue-50 ring-2 ring-blue-400' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onSelectState(s)}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">State {s.id}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                        Status {s.parameters.status}
                      </span>
                      {isSplitTransition && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">
                          Split
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(s.timestamp).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      Temperature: {s.parameters.temperature_c}°C
                      Volume: {s.parameters.volume_ml}ml
                    </div>
                    {s.parent_id && (
                      <div className="text-xs text-gray-400">
                        ← State {s.parent_id}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 