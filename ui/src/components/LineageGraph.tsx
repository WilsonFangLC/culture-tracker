import { Tree, TreeNodeDatum } from 'react-d3-tree'
import { CellState } from '../api'
import { useCallback, useMemo } from 'react'

interface LineageGraphProps {
  state: CellState
  states: CellState[]
  onSelectState: (state: CellState) => void
}

interface CustomNodeDatum extends TreeNodeDatum {
  stateId: number
  attributes: {
    status: string
    temperature: string
    volume: string
    cellDensity: string
    viability: string
  }
}

export default function LineageGraph({ state, states, onSelectState }: LineageGraphProps) {
  // Convert our states into a tree structure that react-d3-tree can use
  const convertToTree = useCallback((currentState: CellState): CustomNodeDatum => {
    const children = states.filter(s => s.parent_id === currentState.id)
    
    return {
      name: `State ${currentState.id}`,
      stateId: currentState.id,
      attributes: {
        status: `Status ${currentState.parameters.status}`,
        temperature: `${currentState.parameters.temperature_c}°C`,
        volume: `${currentState.parameters.volume_ml}ml`,
        cellDensity: `${currentState.parameters.cell_density.toLocaleString()} cells/ml`,
        viability: `${currentState.parameters.viability}%`,
      },
      children: children.length > 0 ? children.map(convertToTree) : undefined,
      __rd3t: {
        id: currentState.id.toString(),
        depth: 0,
        collapsed: false,
      },
    } as CustomNodeDatum
  }, [states])

  // Find the root state (state with no parent)
  const rootState = useMemo(() => {
    let current = state
    while (current.parent_id) {
      const parent = states.find(s => s.id === current.parent_id)
      if (!parent) break
      current = parent
    }
    return current
  }, [state, states])

  const treeData = useMemo(() => convertToTree(rootState), [rootState, convertToTree])

  const handleNodeClick = useCallback((node: any) => {
    const stateId = (node.data as CustomNodeDatum).stateId
    const selectedState = states.find(s => s.id === stateId)
    if (selectedState) {
      onSelectState(selectedState)
    }
  }, [states, onSelectState])

  return (
    <div className="w-full h-[600px] border rounded-lg bg-white p-4">
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
                fill={customNode.stateId === state.id ? '#3b82f6' : '#e5e7eb'}
                stroke={customNode.stateId === state.id ? '#2563eb' : '#9ca3af'}
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
                  {customNode.name}
                </text>
                <text
                  className="rd3t-label__attributes"
                  x="0"
                  y="60"
                  textAnchor="middle"
                  style={{ fontSize: '10px' }}
                >
                  {customNode.attributes.status}
                </text>
                <text
                  className="rd3t-label__attributes"
                  x="0"
                  y="75"
                  textAnchor="middle"
                  style={{ fontSize: '10px' }}
                >
                  {customNode.attributes.temperature}
                </text>
                <text
                  className="rd3t-label__attributes"
                  x="0"
                  y="90"
                  textAnchor="middle"
                  style={{ fontSize: '10px' }}
                >
                  {customNode.attributes.volume}
                </text>
              </g>
            </g>
          )
        }}
      />
    </div>
  )
} 