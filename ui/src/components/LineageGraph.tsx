import { Tree, TreeNodeDatum } from 'react-d3-tree'
import { CellState } from '../api'
import { useCallback, useMemo } from 'react'
import './LineageGraph.css'

interface LineageGraphProps {
  state: CellState | null
  states: CellState[]
  onSelectState: (state: CellState) => void
  onDeleteState: (stateId: number) => void
}

interface CustomNodeDatum extends TreeNodeDatum {
  stateId: number
  stateName: string
  timestamp: string
  transitionType?: string
  created_by: string
  additional_notes?: string
  attributes: {
    status: string
    temperature: string
    volume: string
    location: string
    cellDensity: string
    viability: string
    storageLocation?: string
  }
}

const defaultNodeDatum: CustomNodeDatum = {
  name: 'No State',
  stateId: 0,
  stateName: 'No State',
  timestamp: 'N/A',
  transitionType: undefined,
  created_by: 'N/A',
  additional_notes: undefined,
  attributes: {
    status: 'N/A',
    temperature: 'N/A',
    volume: 'N/A',
    location: 'N/A',
    cellDensity: 'N/A',
    viability: 'N/A',
  },
  children: [],
  __rd3t: {
    id: '0',
    depth: 0,
    collapsed: false,
  },
}

export default function LineageGraph({ state, states, onSelectState, onDeleteState }: LineageGraphProps) {
  // Convert our states into a tree structure that react-d3-tree can use
  const convertToTree = useCallback((currentState: CellState | null): CustomNodeDatum => {
    if (!currentState) {
      return defaultNodeDatum
    }

    const children = states.filter(s => s.parent_id === currentState.id)
    const parameters = currentState.parameters || {};

    return {
      name: currentState.name || `State ${currentState.id}`,
      stateId: currentState.id,
      stateName: currentState.name || `State ${currentState.id}`,
      timestamp: new Date(currentState.timestamp).toLocaleString(),
      transitionType: currentState.transition_type,
      created_by: currentState.created_by,
      additional_notes: currentState.additional_notes,
      attributes: {
        status: `Status: ${parameters?.status || 'N/A'}`,
        temperature: `Temp: ${parameters?.temperature_c ?? 'N/A'}°C`,
        volume: `Vol: ${parameters?.volume_ml ?? 'N/A'}ml`,
        location: `Loc: ${parameters?.location || 'N/A'}`,
        cellDensity: `Density: ${(parameters?.cell_density ?? 0).toLocaleString()} c/ml`,
        viability: `Viability: ${parameters?.viability ?? 'N/A'}%`,
        storageLocation: parameters?.storage_location ? `Storage: ${parameters.storage_location}` : undefined,
      },
      children: children.length > 0 ? children.map(child => convertToTree(child)) : [],
      __rd3t: {
        id: currentState.id.toString(),
        depth: 0,
        collapsed: false,
      },
    } as CustomNodeDatum
  }, [])

  // Find the root state (state with no parent)
  const rootState = useMemo(() => {
    if (!state || !states.length) return null
    let current = state
    while (current.parent_id) {
      const parent = states.find(s => s.id === current.parent_id)
      if (!parent) break
      current = parent
    }
    return current
  }, [state, states])

  const treeData = useMemo(() => {
    if (!rootState) {
      return defaultNodeDatum
    }
    return convertToTree(rootState)
  }, [rootState, convertToTree])

  const handleNodeClick = useCallback((node: any) => {
    if (!node?.data) return
    const stateId = (node.data as CustomNodeDatum).stateId
    if (stateId === 0) return // Don't handle clicks on the default node
    const selectedState = states.find(s => s.id === stateId)
    if (selectedState) {
      onSelectState(selectedState)
    }
  }, [states, onSelectState])

  const handleDeleteClick = useCallback((stateId: number) => {
    if (window.confirm("Are you sure you want to delete this state? This action cannot be undone if the state has no children.")) {
      onDeleteState(stateId);
    }
  }, [onDeleteState]);

  return (
    <div className="w-full h-[600px] border rounded-lg bg-white p-4">
      {!state || !states.length ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          No states available to display
        </div>
      ) : (
        <Tree
          data={treeData}
          orientation="vertical"
          pathFunc="step"
          translate={{ x: 400, y: 50 }}
          separation={{ siblings: 2, nonSiblings: 2 }}
          nodeSize={{ x: 200, y: 300 }}
          onNodeClick={handleNodeClick}
          transitionDuration={0}
          renderCustomNodeElement={({ nodeDatum, toggleNode }) => {
            const customNode = nodeDatum as CustomNodeDatum
            const attributeLines = Object.values(customNode.attributes).filter(Boolean);

            // Tooltip content - Simplified and updated
            const tooltipParts = [];
            if (customNode.transitionType) {
              tooltipParts.push(`Type: ${customNode.transitionType}`);
            }
            if (customNode.additional_notes) {
              tooltipParts.push(`Notes: ${customNode.additional_notes}`);
            }
            const tooltipContent = tooltipParts.length > 0 ? tooltipParts.join('\n') : ''; // Only create tooltip if there's content

            return (
              <g 
                className="custom-node-group" 
                data-tooltip={tooltipContent} // Use updated content
              >
                <circle
                  r={20}
                  fill={customNode.stateId === (state?.id ?? 0) ? '#3b82f6' : '#e5e7eb'}
                  stroke={customNode.stateId === (state?.id ?? 0) ? '#2563eb' : '#9ca3af'}
                  strokeWidth="2"
                  onClick={toggleNode}
                />
                {customNode.stateId !== 0 && (
                  <text
                    x="18"
                    y="-12"
                    fontSize="12"
                    fill="red"
                    textAnchor="middle"
                    cursor="pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(customNode.stateId);
                    }}
                  >
                    X
                  </text>
                )}
                {customNode.transitionType && (
                  <text
                    textAnchor="middle"
                    y={-25}
                    style={{ fontSize: '10px', fill: '#888', fontStyle: 'italic', pointerEvents: 'none' }}
                  >
                    ({customNode.transitionType})
                  </text>
                )}
                <g className="rd3t-label" transform="translate(0, 30)">
                  <text
                    className="rd3t-label__title"
                    textAnchor="middle"
                    y={5}
                    style={{ fontSize: '12px', fontWeight: 'bold', pointerEvents: 'none' }}
                  >
                    {customNode.stateName}
                  </text>
                  <text
                    className="rd3t-label__timestamp"
                    textAnchor="middle"
                    y={20}
                    style={{ fontSize: '10px', fill: '#6b7280', pointerEvents: 'none', fontWeight: 'normal' }}
                  >
                    {customNode.timestamp}
                  </text>
                  {attributeLines.map((attr, index) => (
                    <text
                      key={attr}
                      className="rd3t-label__attributes"
                      textAnchor="middle"
                      y={35 + index * 12}
                      style={{ fontSize: '10px', pointerEvents: 'none' }}
                    >
                      {attr}
                    </text>
                  ))}
                </g>
              </g>
            )
          }}
        />
      )}
    </div>
  )
} 