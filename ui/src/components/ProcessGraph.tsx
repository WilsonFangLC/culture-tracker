import { useCallback, useEffect, useMemo, useRef } from 'react';
import { CellState } from '../api';
import './ProcessGraph.css'; // We'll create this later

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

export default function ProcessGraph({ state, states, onSelectState, onDeleteState }: ProcessGraphProps) {
  // Ref for the canvas container to calculate positions
  const canvasRef = useRef<HTMLDivElement>(null);
  
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
    // Find states that start processes
    const processStartStates = states.filter(s => {
      const operationType = getOperationType(s);
      if (operationType === null) return false; // Must have an op type

      if (s.parent_id === null) return true; // Is a root op state

      const parentState = states.find(p => p.id === s.parent_id);
      if (!parentState) return true; // Orphaned op state, treat as a root for a new process branch
      
      // Parent must NOT be an op state for this to be a new visual process node
      return getOperationType(parentState) === null; 
    });
    
    // Group by process, tracking start and end states
    const processesByStartId: Record<number, {
      startState: CellState;
      endState: CellState | null;
      measurements: CellState[];
    }> = {};
    
    for (const startState of processStartStates) {
      const endState = findEndState(startState);
      processesByStartId[startState.id] = {
        startState,
        endState,
        measurements: []
      };
    }
    
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
    
    return processDataList;
  }, [states]);

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

  // Effect to draw connections between parent and child processes
  useEffect(() => {
    const drawEdges = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Get all nodes with parent references
      const nodeElements = canvas.querySelectorAll('.process-node[data-parent-id]');
      
      nodeElements.forEach((nodeElement) => {
        const node = nodeElement as HTMLElement;
        const parentId = node.getAttribute('data-parent-id');
        if (!parentId) return;
        
        const parent = canvas.querySelector(`.process-node[data-id="${parentId}"]`) as HTMLElement;
        if (!parent) return;
        
        // Get the edge element
        const edge = node.querySelector('.process-edge') as HTMLElement;
        if (!edge) return;
        
        // Calculate positions
        const parentRect = parent.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        
        // Calculate center points
        const parentCenter = {
          x: parentRect.left + parentRect.width / 2,
          y: parentRect.top + parentRect.height / 2
        };
        
        const nodeCenter = {
          x: nodeRect.left + nodeRect.width / 2,
          y: nodeRect.top + nodeRect.height / 2
        };
        
        // Adjust for canvas position/scroll
        const scrollOffsetX = canvas.scrollLeft;
        const scrollOffsetY = canvas.scrollTop;
        
        // Determine edge start and end points (from parent right to child left)
        const startX = parentRect.right - canvasRect.left + scrollOffsetX;
        const startY = parentCenter.y - canvasRect.top + scrollOffsetY;
        
        const endX = nodeRect.left - canvasRect.left + scrollOffsetX;
        const endY = nodeCenter.y - canvasRect.top + scrollOffsetY;
        
        // Position the edge
        const length = Math.max(endX - startX, 10); // Ensure minimum width
        
        edge.style.width = `${length}px`;
        edge.style.height = '2px';
        edge.style.position = 'absolute';
        edge.style.left = `-${length}px`; // Position to the left of the node
        edge.style.top = `${nodeRect.height / 2}px`;
        
        // If the nodes are at different vertical positions, use a path with a bend
        if (Math.abs(startY - endY) > 10) {
          // Create SVG for curved path if not already created
          if (!edge.querySelector('svg')) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.style.position = 'absolute';
            svg.style.overflow = 'visible';
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('stroke', '#9ca3af');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none');
            
            svg.appendChild(path);
            edge.appendChild(svg);
          }
          
          // Get the SVG and path
          const svg = edge.querySelector('svg') as SVGElement;
          const path = svg.querySelector('path') as SVGPathElement;
          
          // Calculate path
          const midX = length / 2;
          const controlPoint1X = midX - 20;
          const controlPoint2X = midX + 20;
          
          // Create bezier curve path
          const d = `M 0,0 C ${controlPoint1X},0 ${controlPoint2X},${endY - startY} ${length},${endY - startY}`;
          
          path.setAttribute('d', d);
        }
      });
    };
    
    // Draw edges on load and window resize
    drawEdges();
    window.addEventListener('resize', drawEdges);
    
    // Add listener for canvas scroll events
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('scroll', drawEdges);
    }
    
    // Return cleanup function
    return () => {
      window.removeEventListener('resize', drawEdges);
      if (canvas) {
        canvas.removeEventListener('scroll', drawEdges);
      }
    };
  }, [processes]);

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
              
              {/* Edge for connecting to parent */}
              {processData.parentId && <div className="process-edge"></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
} 