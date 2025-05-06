import { CellState } from '../api';

// Process types that can be represented as nodes
export type ProcessType = 'passage' | 'freeze' | 'thaw' | 'split' | 'start_new_culture';

// Status of the process 
export type ProcessStatus = 'ongoing' | 'completed';

// Interface for a process node in the graph
export interface ProcessNode {
  id: string;
  name: string;
  type: ProcessType;
  status: ProcessStatus;
  startTime: string;
  endTime: string | null;
  startStateId: number;
  endStateId: number | null;
  sourceState: CellState;
  destinationState: CellState | null;
  children: ProcessNode[];
  parameters: Record<string, any>;
}

// Interface for D3 tree node format
export interface D3TreeNode {
  name: string;
  processId?: string;
  processType?: ProcessType;
  processStatus?: ProcessStatus;
  startStateId?: number;
  endStateId?: number | null;
  startTime?: string;
  endTime?: string | null;
  attributes: Record<string, string>;
  children: D3TreeNode[];
}

/**
 * Determines if a state represents a measurement (which shouldn't create a node)
 */
const isMeasurementState = (state: CellState): boolean => {
  return state.transition_type === 'measurement';
};

/**
 * Creates a process node from a start state
 */
const createProcessNode = (
  startState: CellState,
  children: ProcessNode[]
): ProcessNode => {
  const processType = startState.parameters?.transition_parameters?.operation_type as ProcessType || 'passage';
  
  // A process is completed if it has any children (any state that continues from this one)
  const isCompleted = children.length > 0;
  // If we have children, use the earliest child's timestamp as the end time
  const endTime = isCompleted && children.length > 0 
    ? children.reduce((earliest, child) => {
        const childTime = new Date(child.startTime).getTime();
        return earliest === null || childTime < earliest ? childTime : earliest;
      }, null as number | null)
    : null;
  
  return {
    id: `process-${startState.id}`,
    name: startState.name || `Process ${startState.id}`,
    type: processType,
    status: isCompleted ? 'completed' : 'ongoing',
    startTime: startState.timestamp,
    endTime: endTime ? new Date(endTime).toISOString() : null,
    startStateId: startState.id,
    endStateId: null, // No specific end state now
    sourceState: startState,
    destinationState: null,
    children: children,
    parameters: {
      ...startState.parameters
    }
  };
};

/**
 * Builds a tree of process nodes from a list of states
 */
export const buildProcessTree = (states: CellState[], rootStateId?: number): ProcessNode[] => {
  if (!states.length) {
    return [];
  }

  // Create a map for quick lookup
  const stateMap = new Map<number, CellState>();
  states.forEach(state => stateMap.set(state.id, state));

  // Find all states without parents or the specified root
  const rootStates = rootStateId 
    ? [stateMap.get(rootStateId)].filter(Boolean) as CellState[]
    : states.filter(s => !s.parent_id || !stateMap.has(s.parent_id));

  // Process nodes cache to avoid duplicate processing
  const processedNodes = new Map<number, ProcessNode>();

  // Function to recursively build the tree
  const buildTree = (state: CellState): ProcessNode[] => {
    // Skip measurement states
    if (isMeasurementState(state)) {
      return [];
    }

    // If this state was already processed, return empty
    if (processedNodes.has(state.id)) {
      return [];
    }

    // Find all children of this state
    const childStates = states.filter(s => s.parent_id === state.id);
    
    // Process all children (excluding measurements)
    const childProcesses = childStates
      .filter(s => !isMeasurementState(s))
      .flatMap(buildTree);
    
    // Create the process node with all child processes
    const processNode = createProcessNode(state, childProcesses);
    
    // Cache this node
    processedNodes.set(state.id, processNode);

    return [processNode];
  };

  // Build the tree starting from root states
  return rootStates.flatMap(buildTree);
};

/**
 * Converts a process tree to a format compatible with react-d3-tree
 * If skipRootNode is true, it will return an array of children instead of a single root node
 */
export const processTreeToD3Tree = (processNodes: ProcessNode[], skipRootNode: boolean = false): D3TreeNode | D3TreeNode[] => {
  // If skipRootNode is true and we have nodes, return them directly as an array
  if (skipRootNode && processNodes.length > 0) {
    return processNodes.map(convertProcessNodeToD3);
  }
  
  // Otherwise, create a root node
  const rootNode: D3TreeNode = {
    name: 'Processes',
    attributes: {},
    children: processNodes.map(convertProcessNodeToD3)
  };

  return rootNode;
};

/**
 * Recursively converts a process node to D3 tree format
 */
const convertProcessNodeToD3 = (node: ProcessNode): D3TreeNode => {
  const statusIndicator = node.status === 'completed' ? '✓' : '⋯';
  const durationText = node.endTime 
    ? `Duration: ${formatDuration(new Date(node.startTime), new Date(node.endTime))}`
    : 'Ongoing';

  return {
    name: `${node.name} (${statusIndicator})`,
    processId: node.id,
    processType: node.type,
    processStatus: node.status,
    startStateId: node.startStateId,
    endStateId: node.endStateId,
    startTime: node.startTime,
    endTime: node.endTime,
    attributes: {
      type: `Type: ${formatProcessType(node.type)}`,
      status: `Status: ${node.status === 'completed' ? 'Completed' : 'Ongoing'}`,
      duration: durationText,
      startTime: `Started: ${new Date(node.startTime).toLocaleString()}`,
      ...(node.endTime ? { endTime: `Ended: ${new Date(node.endTime).toLocaleString()}` } : {})
    },
    children: node.children.map(convertProcessNodeToD3)
  };
};

/**
 * Format process type for display
 */
const formatProcessType = (type: ProcessType): string => {
  switch (type) {
    case 'passage': return 'Passage';
    case 'freeze': return 'Freeze';
    case 'thaw': return 'Thaw';
    case 'split': return 'Split';
    case 'start_new_culture': return 'New Culture';
    default: return type;
  }
};

/**
 * Format duration between two dates
 */
const formatDuration = (start: Date, end: Date): string => {
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays > 0) {
    return `${diffDays}d ${diffHours}h`;
  }
  return `${diffHours}h`;
}; 