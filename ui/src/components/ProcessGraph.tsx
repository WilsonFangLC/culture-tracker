import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CellState } from '../api';
import './ProcessGraph.css'; // We'll create this later

// Add debounce utility
const debounce = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

interface ProcessGraphProps {
  state: CellState | null;
  states: CellState[];
  onSelectState: (state: CellState) => void;
  onDeleteState: (stateId: number) => void;
}

// Define node types
type ProcessNodeType = 'passage' | 'freeze' | 'thaw' | 'split' | 'start_new_culture';
type ProcessStatus = 'open' | 'completed';

// Interface for process data
interface ProcessData {
  id: string;
  startState: CellState;
  endState: CellState | null;
  processType: ProcessNodeType;
  status: ProcessStatus;
  measurements: CellState[];
  position: { x: number; y: number };
  parentId?: string;
}

// Interface for edge data
interface EdgeData {
  id: string;
  sourceId: string;
  targetId: string;
  sourceDomRect: DOMRect | null;
  targetDomRect: DOMRect | null;
}

export default function ProcessGraph({ state, states, onSelectState, onDeleteState }: ProcessGraphProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Find operation type from transition parameters
  const getOperationType = (state: CellState): ProcessNodeType | null => {
    const operationType = state.parameters?.transition_parameters?.operation_type;
    if (!operationType) return null;
    
    if (['passage', 'freeze', 'thaw', 'split', 'start_new_culture'].includes(operationType)) {
      return operationType as ProcessNodeType;
    }
    return null;
  };

  // Determine if a state is a measurement
  const isMeasurement = (state: CellState): boolean => {
    return state.transition_type === 'measurement';
  };
  
  // Find end state for a process
  const findEndState = (startState: CellState): CellState | null => {
    // Check if this state has any child that starts another process
    const childProcess = states.find(s => 
      s.parent_id === startState.id && 
      s.parameters?.transition_parameters?.operation_type &&
      s.parameters.transition_parameters.operation_type !== 'measurement'
    );
    
    if (childProcess) return childProcess;
    
    // If no child process found, the process is still open
    return null;
  };
  
  // Group measurements with their related process
  const associateMeasurementsWithProcesses = (processesByStartId: Record<number, {
    startState: CellState;
    endState: CellState | null;
    measurements: CellState[];
  }>) => {
    const measurementStates = states.filter(isMeasurement);
    
    for (const measurement of measurementStates) {
      if (!measurement.parent_id) continue;
      
      // Look for a process where this measurement's parent is either the start or part of the same branch
      let foundProcessId = null;
      
      // Direct parent is a process start
      if (processesByStartId[measurement.parent_id]) {
        foundProcessId = measurement.parent_id;
      } else {
        // Otherwise, trace up the parent chain until we find a process start or root
        let currentState = measurement;
        while (currentState.parent_id) {
          if (processesByStartId[currentState.parent_id]) {
            foundProcessId = currentState.parent_id;
            break;
          }
          const parent = states.find(s => s.id === currentState.parent_id);
          if (!parent) break;
          currentState = parent;
        }
      }
      
      if (foundProcessId) {
        processesByStartId[foundProcessId].measurements.push(measurement);
      }
    }
  };

  // Transform CellState data into process nodes
  const processes = useMemo(() => {
    console.log('--- Building process nodes ---');

    // Find states that start processes
    const processStartStates = states.filter(s => {
      const operationType = getOperationType(s);
      if (operationType === null) return false; // Must have an operation type
      
      // All states with operation types should be shown as process nodes
      return true;
    });
    
    console.log(`Found ${processStartStates.length} states with operation types`);
    console.log('Process start state IDs:', processStartStates.map(s => s.id));
    
    // Group by process, tracking start and end states
    const processesByStartId: Record<number, {
      startState: CellState;
      endState: CellState | null;
      measurements: CellState[];
    }> = {};
    
    // Log any duplicate state IDs in the original array 
    const stateIdCounts = new Map<number, number>();
    states.forEach(s => {
      stateIdCounts.set(s.id, (stateIdCounts.get(s.id) || 0) + 1);
    });
    
    const duplicateStateIds = Array.from(stateIdCounts.entries())
      .filter(([id, count]) => count > 1)
      .map(([id]) => id);
    
    if (duplicateStateIds.length > 0) {
      console.log('WARNING: Found duplicate state IDs in the original states array:', duplicateStateIds);
    }
    
    for (const startState of processStartStates) {
      const endState = findEndState(startState);
      processesByStartId[startState.id] = {
        startState,
        endState,
        measurements: []
      };
    }
    
    // Check for any duplicate process definitions
    console.log(`Created ${Object.keys(processesByStartId).length} process definitions`);
    
    // Associate measurements with their processes
    associateMeasurementsWithProcesses(processesByStartId);
    
    // Process positions - calculate levels for each node (distance from root)
    const nodeLevels: Record<number, number> = {};
    
    for (const startState of processStartStates) {
      let level = 0;
      let currentState = startState;
      
      while (currentState.parent_id) {
        level++;
        const parent = states.find(s => s.id === currentState.parent_id);
        if (!parent) break;
        currentState = parent;
      }
      
      nodeLevels[startState.id] = level;
    }
    
    // Group nodes by levels for layout
    const nodesByLevel: Record<number, number[]> = {};
    for (const [stateId, level] of Object.entries(nodeLevels)) {
      if (!nodesByLevel[level]) nodesByLevel[level] = [];
      nodesByLevel[level].push(Number(stateId));
    }
    
    // Create positions based on levels
    const xSpacing = 300;
    const ySpacing = 120;
    const positions: Record<number, { x: number, y: number }> = {};
    
    // Calculate positions by level
    for (const [level, stateIds] of Object.entries(nodesByLevel)) {
      const x = Number(level) * xSpacing + 50;
      
      stateIds.forEach((stateId, index) => {
        const y = 50 + (index * ySpacing);
        positions[stateId] = { x, y };
      });
    }
    
    // Create final process data
    const processDataList: ProcessData[] = [];
    
    for (const [startStateId, process] of Object.entries(processesByStartId)) {
      const { startState, endState, measurements } = process;
      const processType = getOperationType(startState);
      
      if (!processType) continue;
      
      const position = positions[startState.id] || { x: 0, y: 0 };
      let parentId: string | undefined = undefined;
      
      // Set parent ID for edges
      if (startState.parent_id) {
        let FarthestKnownParentProcessStartStateId: number | null = null;
        let currentAncestorId: number | null = startState.parent_id;
        const visitedAncestorIds = new Set<number>(); // To prevent infinite loops with cyclic data

        while (currentAncestorId !== null && !visitedAncestorIds.has(currentAncestorId)) {
          visitedAncestorIds.add(currentAncestorId);
          const ancestorState = states.find(s => s.id === currentAncestorId);
          if (!ancestorState) {
            break; 
          }
          if (getOperationType(ancestorState) !== null) {
            FarthestKnownParentProcessStartStateId = ancestorState.id;
            break; 
          }
          currentAncestorId = ancestorState.parent_id;
        }
        
        if (FarthestKnownParentProcessStartStateId !== null) {
          parentId = `process-${FarthestKnownParentProcessStartStateId}`;
        }
      }
      
      processDataList.push({
        id: `process-${startState.id}`,
        startState,
        endState,
        processType,
        status: endState ? 'completed' : 'open',
        measurements,
        position,
        parentId
      });
    }
    
    // Deduplicate processes by ID to ensure no duplicates
    const uniqueProcessMap = new Map<string, ProcessData>();
    for (const process of processDataList) {
      uniqueProcessMap.set(process.id, process);
    }
    
    // Use the unique processes for rendering
    const uniqueProcessList = Array.from(uniqueProcessMap.values());
    console.log(`Filtered ${processDataList.length} processes to ${uniqueProcessList.length} unique processes`);
    
    return uniqueProcessList;
  }, [states]);

  // Extract parent-child relationships for edges
  const processRelationships = useMemo(() => {
    return processes
      .filter(process => process.parentId)
      .map(process => ({
        id: `edge-${process.parentId}-to-${process.id}`,
        sourceId: process.parentId!,
        targetId: process.id,
        sourceDomRect: null,
        targetDomRect: null
      }));
  }, [processes]);

  // Handle node click to select the state
  const handleNodeClick = useCallback((processData: ProcessData) => {
    onSelectState(processData.startState);
  }, [onSelectState]);

  const handleDeleteClick = useCallback((stateId: number) => {
    if (window.confirm("Are you sure you want to delete this state?")) {
      onDeleteState(stateId);
    }
  }, [onDeleteState]);

  // Get CSS class for node based on process type and status
  const getNodeClass = (processType: ProcessNodeType, status: ProcessStatus, isSelected: boolean) => {
    let classes = ['process-node'];
    
    // Add class for process type
    classes.push(`process-type-${processType}`);
    
    // Add class for status
    classes.push(`process-status-${status}`);
    
    // Add class if selected
    if (isSelected) {
      classes.push('selected');
    }
    
    return classes.join(' ');
  };

  // Set up node refs
  const setNodeRef = useCallback((node: HTMLDivElement | null, id: string) => {
    if (node) {
      nodeRefs.current.set(id, node);
    } else {
      nodeRefs.current.delete(id);
    }
  }, []);

  // Calculate edge paths
  const calculateEdges = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || processRelationships.length === 0) return;

    const canvasRect = canvas.getBoundingClientRect();
    const newEdges = processRelationships.map(rel => {
      const sourceNode = nodeRefs.current.get(rel.sourceId);
      const targetNode = nodeRefs.current.get(rel.targetId);
      
      return {
        ...rel,
        sourceDomRect: sourceNode?.getBoundingClientRect() || null,
        targetDomRect: targetNode?.getBoundingClientRect() || null
      };
    }).filter(edge => edge.sourceDomRect && edge.targetDomRect);

    setEdges(newEdges);
  }, [processRelationships]);

  // Set up observer to recalculate edges when needed
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Calculate edges initially and after resize/scroll
    calculateEdges();
    
    const debouncedCalculateEdges = debounce(calculateEdges, 100);
    
    // Use ResizeObserver to detect size changes
    const resizeObserver = new ResizeObserver(debouncedCalculateEdges);
    resizeObserver.observe(canvas);
    
    // Handle scroll events
    canvas.addEventListener('scroll', debouncedCalculateEdges);
    window.addEventListener('resize', debouncedCalculateEdges);
    
    return () => {
      resizeObserver.disconnect();
      canvas.removeEventListener('scroll', debouncedCalculateEdges);
      window.removeEventListener('resize', debouncedCalculateEdges);
    };
  }, [calculateEdges]);

  // SVG component for edge rendering
  const EdgesSVG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || edges.length === 0) return null;
    
    const canvasRect = canvas.getBoundingClientRect();
    
    return (
      <svg className="edges-svg" width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}>
        {edges.map(edge => {
          if (!edge.sourceDomRect || !edge.targetDomRect) return null;
          
          // Calculate position relative to canvas
          const sourceX = edge.sourceDomRect.right - canvasRect.left + canvas.scrollLeft;
          const sourceY = edge.sourceDomRect.top + edge.sourceDomRect.height/2 - canvasRect.top + canvas.scrollTop;
          const targetX = edge.targetDomRect.left - canvasRect.left + canvas.scrollLeft;
          const targetY = edge.targetDomRect.top + edge.targetDomRect.height/2 - canvasRect.top + canvas.scrollTop;
          
          // For straight line
          if (Math.abs(sourceY - targetY) <= 10) {
            return (
              <line
                key={edge.id}
                x1={sourceX}
                y1={sourceY}
                x2={targetX}
                y2={targetY}
                stroke="#9ca3af"
                strokeWidth="2"
              />
            );
          }
          
          // For curved line (when source and target are at different Y positions)
          const midX = sourceX + (targetX - sourceX) / 2;
          
          return (
            <path
              key={edge.id}
              d={`M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`}
              stroke="#9ca3af"
              strokeWidth="2"
              fill="none"
            />
          );
        })}
      </svg>
    );
  }, [edges]);

  return (
    <div className="process-graph-container">
      <div className="process-graph-legend">
        <div className="legend-item">
          <span className="legend-icon open"></span> Open Process (active)
        </div>
        <div className="legend-item">
          <span className="legend-icon completed"></span> Completed Process (has next step)
        </div>
      </div>
      
      <div className="process-graph-canvas" ref={canvasRef}>
        <EdgesSVG />
        
        {processes.length === 0 && (
          <div className="empty-message">No process data available</div>
        )}
        
        {processes.map(processData => {
          const isSelected = 
            state?.id === processData.startState.id || 
            state?.id === processData.endState?.id;
            
          return (
            <div 
              key={processData.id}
              ref={node => setNodeRef(node, processData.id)}
              className={getNodeClass(processData.processType, processData.status, isSelected)}
              style={{
                left: `${processData.position.x}px`,
                top: `${processData.position.y}px`
              }}
              onClick={() => handleNodeClick(processData)}
              data-id={processData.id}
              data-parent-id={processData.parentId || ''}
            >
              <div className="process-node-header">
                {processData.processType.replace(/_/g, ' ')}
                <span className="process-status">
                  ({processData.status === 'open' ? 'active' : 'complete'})
                </span>
                <button 
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(processData.startState.id);
                  }}
                >
                  ×
                </button>
              </div>
              
              <div className="process-node-label">
                {processData.startState.name || `Process ${processData.startState.id}`}
              </div>
              
              <div className="process-node-info">
                <div>
                  <span className="info-label">Started:</span> {new Date(processData.startState.timestamp).toLocaleDateString()}
                </div>
                
                {processData.endState && (
                  <div>
                    <span className="info-label">Completed:</span> {new Date(processData.endState.timestamp).toLocaleDateString()}
                  </div>
                )}
                
                <div>
                  <span className="info-label">Density:</span> {(processData.startState.parameters?.cell_density ?? 0).toLocaleString()} cells/ml
                </div>

                {processData.measurements.length > 0 && (
                  <div className="measurement-indicator">
                    <span className="info-label">{processData.measurements.length} Measurement{processData.measurements.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 