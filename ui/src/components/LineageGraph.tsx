import { Tree, TreeNodeDatum } from 'react-d3-tree'
import { CellState } from '../api'
import { useCallback, useMemo } from 'react'

interface LineageGraphProps {
  state: CellState | null
  states: CellState[]
  onSelectState: (state: CellState) => void
}

interface CustomNodeDatum extends TreeNodeDatum {
  stateId: number
  stateName: string
  attributes: {
    status: string
    temperature: string
    volume: string
    cellDensity: string
    viability: string
  }
}

const defaultNodeDatum: CustomNodeDatum = {
  name: 'No State',
  stateId: 0,
  stateName: 'No State',
  attributes: {
    status: 'N/A',
    temperature: 'N/A',
    volume: 'N/A',
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

export default function LineageGraph({ state, states, onSelectState }: LineageGraphProps) {
  // Convert our states into a tree structure that react-d3-tree can use
  const convertToTree = useCallback((currentState: CellState | null): CustomNodeDatum => {
    if (!currentState) {
      return defaultNodeDatum
    }

    const children = states.filter(s => s.parent_id === currentState.id)
    
    return {
      name: currentState.name || `State ${currentState.id}`,
      stateId: currentState.id,
      stateName: currentState.name || `State ${currentState.id}`,
      attributes: {
        status: `Status ${currentState.parameters?.status || 'N/A'}`,
        temperature: `${currentState.parameters?.temperature_c || 'N/A'}°C`,
        volume: `${currentState.parameters?.volume_ml || 'N/A'}ml`,
        cellDensity: `${(currentState.parameters?.cell_density || 0).toLocaleString()} cells/ml`,
        viability: `${currentState.parameters?.viability || 'N/A'}%`,
      },
      children: children.length > 0 ? children.map(child => convertToTree(child)) : [],
      __rd3t: {
        id: currentState.id.toString(),
        depth: 0,
        collapsed: false,
      },
    } as CustomNodeDatum
  }, [states])

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
          nodeSize={{ x: 200, y: 200 }}
          onNodeClick={handleNodeClick}
          renderCustomNodeElement={({ nodeDatum, toggleNode }) => {
            const customNode = nodeDatum as CustomNodeDatum
            return (
              <g>
                <circle
                  r={20}
                  fill={customNode.stateId === (state?.id ?? 0) ? '#3b82f6' : '#e5e7eb'}
                  stroke={customNode.stateId === (state?.id ?? 0) ? '#2563eb' : '#9ca3af'}
                  strokeWidth="2"
                  onClick={toggleNode}
                />
                <g className="rd3t-label">
                  <text
                    className="rd3t-label__title"
                    textAnchor="middle"
                    x="0"
                    y="40"
                    style={{ fontSize: '12px', fontWeight: 'bold' }}
                  >
                    {customNode.stateName}
                  </text>
                  <text
                    className="rd3t-label__attributes"
                    textAnchor="middle"
                    x="0"
                    y="60"
                    style={{ fontSize: '10px' }}
                  >
                    {customNode.attributes.status}
                  </text>
                </g>
              </g>
            )
          }}
        />
      )}
    </div>
  )
} 