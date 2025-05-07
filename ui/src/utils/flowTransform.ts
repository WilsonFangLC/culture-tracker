import { Node, Edge, NodeTypes } from 'reactflow';
import { CellState } from '../api';

// Define custom node data
export interface ProcessNodeData {
  label: string;
  processType: string;
  status: 'ongoing' | 'completed';
  sourceState: CellState;
  startTime: string;
  endTime: string | null;
  parameters: Record<string, any>;
}

/**
 * Transforms cell states into React Flow nodes and edges
 */
export const transformToFlow = (
  states: CellState[],
  selectedStateId?: number | null
): { nodes: Node<ProcessNodeData>[]; edges: Edge[] } => {
  if (!states.length) {
    return { nodes: [], edges: [] };
  }

  // Create a map for quick lookup
  const stateMap = new Map<number, CellState>();
  states.forEach(state => stateMap.set(state.id, state));

  // Track processed states to avoid duplicates
  const processedStateIds = new Set<number>();
  
  // Lists to collect nodes and edges
  const nodes: Node<ProcessNodeData>[] = [];
  const edges: Edge[] = [];

  // Process a state into a node and its connecting edges
  const processState = (state: CellState, x: number = 0, y: number = 0, level: number = 0) => {
    if (processedStateIds.has(state.id) || state.transition_type === 'measurement') {
      return;
    }

    // Mark as processed
    processedStateIds.add(state.id);

    // Find all children of this state
    const childStates = states.filter(s => s.parent_id === state.id && s.transition_type !== 'measurement');
    
    // Determine if this process is complete (has children)
    const isCompleted = childStates.length > 0;
    
    // Calculate end time if process is completed
    let endTime = null;
    if (isCompleted) {
      // Use the earliest child's timestamp as the end time
      const earliestChildTime = childStates.reduce((earliest, child) => {
        const childTime = new Date(child.timestamp).getTime();
        return earliest === null || childTime < earliest ? childTime : earliest;
      }, null as number | null);
      
      if (earliestChildTime !== null) {
        endTime = new Date(earliestChildTime).toISOString();
      }
    }

    // Get process type from transition parameters
    const processType = state.parameters?.transition_parameters?.operation_type || 'unknown';

    // Create a node with this state data
    const node: Node<ProcessNodeData> = {
      id: `node-${state.id}`,
      type: 'processNode', // Custom node type
      position: { x, y },
      data: {
        label: state.name || `State ${state.id}`,
        processType,
        status: isCompleted ? 'completed' : 'ongoing',
        sourceState: state,
        startTime: state.timestamp,
        endTime,
        parameters: state.parameters
      },
      // Apply different styles based on selection state and process status
      style: {
        borderColor: selectedStateId === state.id ? '#3b82f6' : 'transparent',
        borderWidth: selectedStateId === state.id ? 2 : 0,
        borderStyle: 'solid',
      }
    };
    
    nodes.push(node);

    // Process each child and create connecting edges
    if (childStates.length > 0) {
      // Calculate position for child nodes
      const childSpacing = 250;
      const startX = x - ((childStates.length - 1) * childSpacing) / 2;
      
      childStates.forEach((childState, index) => {
        const childX = startX + index * childSpacing;
        const childY = y + 200; // Vertical spacing
        
        // Process child state
        processState(childState, childX, childY, level + 1);
        
        // Create edge connecting parent to child
        edges.push({
          id: `edge-${state.id}-${childState.id}`,
          source: `node-${state.id}`,
          target: `node-${childState.id}`,
          type: 'smoothstep', // Use a curved line style
          style: {
            stroke: '#94a3b8', // Slate color for edges
            strokeWidth: 2,
          },
        });
      });
    }
  };

  // Find root states (states without parents or parents not in the current dataset)
  const rootStates = states.filter(s => !s.parent_id || !stateMap.has(s.parent_id));
  
  // Process each root state
  rootStates.forEach((rootState, index) => {
    processState(rootState, index * 300, 0);
  });

  return { nodes, edges };
}; 