import { Tree } from 'react-d3-tree';
import { CellState } from '../api';
import { useCallback, useMemo } from 'react';
import { 
  buildProcessTree, 
  processTreeToD3Tree, 
  ProcessNode, 
  D3TreeNode,
  ProcessStatus,
  ProcessType
} from '../utils/processTransform';
import './ProcessGraph.css';

interface ProcessGraphProps {
  state: CellState | null;
  states: CellState[];
  onSelectState: (state: CellState) => void;
  onDeleteState: (stateId: number) => void;
}

// Custom type for react-d3-tree node datum with our additional properties
interface CustomNodeDatum extends D3TreeNode {
  processId?: string;
  processType?: ProcessType;
  processStatus?: ProcessStatus;
  startStateId?: number;
  endStateId?: number | null;
  __rd3t: {
    id: string;
    depth: number;
    collapsed: boolean;
  };
}

export default function ProcessGraph({ state, states, onSelectState, onDeleteState }: ProcessGraphProps) {
  // Convert states into a process tree that react-d3-tree can use
  const treeData = useMemo(() => {
    if (!states.length) {
      return { name: 'No Processes', attributes: {}, children: [] };
    }
    
    const processNodes = buildProcessTree(states, state?.id);
    // Get process nodes directly without the root "Processes" node
    return processTreeToD3Tree(processNodes, true);
  }, [states, state]);

  // Handler for clicking a node
  const handleNodeClick = useCallback((nodeDatum: any) => {
    const node = nodeDatum as CustomNodeDatum;
    
    // If this node has a startStateId, select that state
    if (node.startStateId) {
      const selectedState = states.find(s => s.id === node.startStateId);
      if (selectedState) {
        onSelectState(selectedState);
      }
    }
  }, [onSelectState, states]);

  // Handler for delete button click
  const handleDeleteClick = useCallback((stateId: number) => {
    if (window.confirm('Are you sure you want to delete this state?')) {
      onDeleteState(stateId);
    }
  }, [onDeleteState]);

  // Custom node renderer for our process nodes
  const renderCustomNode = ({ nodeDatum, toggleNode }: any) => {
    const node = nodeDatum as CustomNodeDatum;
    
    // Extract attributes to display
    const attributeEntries = Object.entries(node.attributes || {}).filter(([key]) => 
      key !== 'endTime' && key !== 'startTime'
    );
    
    // Determine node appearance based on process status
    const isCompleted = node.processStatus === 'completed';
    const fillColor = isCompleted ? '#4CAF50' : '#2196F3';
    const strokeColor = isCompleted ? '#388E3C' : '#1976D2';
    const strokeWidth = isCompleted ? 2 : 1;
    const strokeDasharray = isCompleted ? 'none' : '5,3';
    
    // Create tooltip content from attributes
    const tooltipContent = Object.entries(node.attributes || {})
      .map(([key, value]) => `${value}`)
      .join('\n');
    
    return (
      <g 
        className={`process-node-group ${isCompleted ? 'process-node-completed' : 'process-node-ongoing'}`}
        data-tooltip={tooltipContent}
        onClick={() => handleNodeClick(node)}
      >
        {/* Node circle */}
        <circle
          r={25}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          onClick={toggleNode}
        />
        
        {/* Process type icon (can be enhanced with SVG icons) */}
        <text
          dy=".35em"
          textAnchor="middle"
          style={{ fill: 'white', fontSize: '12px', fontWeight: 'bold' }}
        >
          {node.processType?.charAt(0).toUpperCase()}
        </text>
        
        {/* Node title */}
        <text
          y={40}
          textAnchor="middle"
          style={{ fontSize: '14px', fontWeight: 'bold' }}
        >
          {node.name.split(' (')[0]}
        </text>
        
        {/* Delete button */}
        {node.startStateId && (
          <text
            x="20"
            y="-20"
            fontSize="12"
            fill="red"
            textAnchor="middle"
            cursor="pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (node.startStateId) {
                handleDeleteClick(node.startStateId);
              }
            }}
          >
            X
          </text>
        )}
        
        {/* Attributes display */}
        <g transform="translate(0, 55)">
          {attributeEntries.map(([key, value], index) => (
            <text
              key={key}
              textAnchor="middle"
              y={index * 15}
              style={{ fontSize: '10px', fill: '#555' }}
            >
              {value}
            </text>
          ))}
        </g>
      </g>
    );
  };

  return (
    <div className="w-full h-[600px] border rounded-lg bg-white p-4">
      {!state || !states.length ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          No states available to display
        </div>
      ) : Array.isArray(treeData) && treeData.length > 0 ? (
        // If treeData is an array (skipRootNode=true), pass the first node as the data
        // This allows us to show only the relevant processes without the "Processes" root node
        <Tree
          data={treeData[0]}
          orientation="vertical"
          pathFunc="step"
          translate={{ x: 400, y: 50 }}
          separation={{ siblings: 2, nonSiblings: 2.5 }}
          nodeSize={{ x: 200, y: 200 }}
          onNodeClick={handleNodeClick}
          transitionDuration={0}
          renderCustomNodeElement={renderCustomNode}
          pathClassFunc={() => 'process-path'}
        />
      ) : (
        // If we don't have any array data, show a simple Tree with default data
        <Tree
          data={typeof treeData === 'object' ? treeData : { name: 'No Processes', attributes: {}, children: [] }}
          orientation="vertical"
          pathFunc="step"
          translate={{ x: 400, y: 50 }}
          separation={{ siblings: 2, nonSiblings: 2.5 }}
          nodeSize={{ x: 200, y: 200 }}
          renderCustomNodeElement={renderCustomNode}
          pathClassFunc={() => 'process-path'}
        />
      )}
    </div>
  );
} 