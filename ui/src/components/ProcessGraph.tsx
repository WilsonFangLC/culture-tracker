import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CellState, CellStateCreate } from '../api';
import './ProcessGraph.css'; // We'll create this later
import CreateStateForm from './CreateStateForm';
import { createPortal } from 'react-dom';
import NodeDetailsPanel from './NodeDetailsPanel';
import { useParameters } from './ParameterUtils';

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
  onCreateState?: (data: Array<{
    name: string;
    timestamp: string;
    parent_id?: number;
    parameters: CellStateCreate['parameters'];
    transition_type?: 'single' | 'split' | 'measurement';
    additional_notes?: string;
  }>) => void;
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

export default function ProcessGraph({ state, states, onSelectState, onDeleteState, onCreateState }: ProcessGraphProps) {
  const { getParameterDisplayName } = useParameters();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showZoomControls, setShowZoomControls] = useState(true);
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [startPanPoint, setStartPanPoint] = useState({ x: 0, y: 0 });
  const [startPanOffset, setStartPanOffset] = useState({ x: 0, y: 0 });
  const [isSpaceKeyDown, setIsSpaceKeyDown] = useState(false);
  
  // State creation modal
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedParentForCreate, setSelectedParentForCreate] = useState<CellState | null>(null);
  
  // Add state for controlling details panel
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<CellState | null>(null);
  
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
    return state.parameters?.transition_parameters?.operation_type === 'measurement';
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

  // Handle node click to select the state and open details panel
  const handleNodeClick = useCallback((processData: ProcessData, e: React.MouseEvent) => {
    // If we're panning, don't select nodes
    if (isPanning) return;
    
    // Select the state
    onSelectState(processData.startState);
    
    // Set the selected node and open the details panel
    setSelectedNode(processData.startState);
    setDetailsPanelOpen(true);
    
    // Force edge recalculation after click
    setTimeout(() => setForceUpdate(prev => prev + 1), 50);
  }, [onSelectState, isPanning]);

  const handleDeleteClick = useCallback((stateId: number) => {
    if (window.confirm("Are you sure you want to delete this state?")) {
      onDeleteState(stateId);
    }
  }, [onDeleteState]);

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => {
      const newZoom = Math.min(prev + 0.2, 3);
      // Force edge recalculation after zoom
      setTimeout(() => setForceUpdate(prev => prev + 1), 50);
      return newZoom;
    });
  }, []);
  
  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => {
      const newZoom = Math.max(prev - 0.2, 0.4);
      // Force edge recalculation after zoom
      setTimeout(() => setForceUpdate(prev => prev + 1), 50);
      return newZoom;
    });
  }, []);
  
  // Handle zoom reset
  const handleZoomReset = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setTimeout(() => setForceUpdate(prev => prev + 1), 50);
  }, []);
  
  // Handle mouse down for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only enable panning with middle mouse button or when holding Spacebar
    if (e.button === 1 || (e.button === 0 && isSpaceKeyDown)) {
      setIsPanning(true);
      setStartPanPoint({ x: e.clientX, y: e.clientY });
      setStartPanOffset({ ...panOffset });
      
      // Prevent text selection during panning
      e.preventDefault();
      
      // Apply grabbing cursor to the container
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none'; // Prevent text selection
      }
    }
  }, [panOffset, isSpaceKeyDown]);
  
  // Handle mouse move for panning
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    
    const newX = startPanOffset.x + (e.clientX - startPanPoint.x) / zoomLevel;
    const newY = startPanOffset.y + (e.clientY - startPanPoint.y) / zoomLevel;
    
    setPanOffset({ x: newX, y: newY });
    
    // Edge recalculation happens on mousemove only when panning to avoid performance issues
    if (e.movementX !== 0 || e.movementY !== 0) {
      setForceUpdate(prev => prev + 1);
    }
    
    e.preventDefault();
  }, [isPanning, startPanOffset, startPanPoint, zoomLevel]);
  
  // Handle mouse up for ending pan
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      
      // Final edge recalculation after panning stops
      setTimeout(() => setForceUpdate(prev => prev + 1), 50);
      
      // Reset cursor
      if (containerRef.current) {
        containerRef.current.style.cursor = isSpaceKeyDown ? 'grab' : 'default';
        document.body.style.userSelect = ''; // Restore text selection
      }
      
      e.preventDefault();
    }
  }, [isPanning, isSpaceKeyDown]);
  
  // Handle mouse leave for safety
  const handleMouseLeave = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      
      // Final edge recalculation after panning stops
      setTimeout(() => setForceUpdate(prev => prev + 1), 50);
      
      // Reset cursor
      if (containerRef.current) {
        containerRef.current.style.cursor = isSpaceKeyDown ? 'grab' : 'default';
        document.body.style.userSelect = ''; // Restore text selection
      }
    }
  }, [isPanning, isSpaceKeyDown]);
  
  // Calculate cursor based on interaction state
  const getCursor = useCallback(() => {
    if (isPanning) {
      return 'grabbing';
    } else if (isSpaceKeyDown) {
      return 'grab';
    }
    return 'default';
  }, [isPanning, isSpaceKeyDown]);
  
  // Handle opening the create form
  const handleOpenCreateForm = useCallback((parentState: CellState | null = null) => {
    if (onCreateState) {
      setSelectedParentForCreate(parentState);
      setShowCreateForm(true);
    }
  }, [onCreateState]);
  
  // Handle form submission
  const handleCreateStateSubmit = useCallback((data: Array<{
    name: string;
    timestamp: string;
    parent_id?: number;
    parameters: CellStateCreate['parameters'];
    transition_type?: 'single' | 'split' | 'measurement';
    additional_notes?: string;
  }>) => {
    if (onCreateState) {
      onCreateState(data);
      setShowCreateForm(false);
      setSelectedParentForCreate(null);
    }
  }, [onCreateState]);
  
  // Handle form cancel
  const handleCreateStateCancel = useCallback(() => {
    setShowCreateForm(false);
    setSelectedParentForCreate(null);
  }, []);

  // Handle closing the details panel
  const handleCloseDetailsPanel = useCallback(() => {
    setDetailsPanelOpen(false);
  }, []);

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

  // Calculate edge paths with improved positioning
  const calculateEdges = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || processRelationships.length === 0) return;

    // Force reflow to ensure accurate measurements
    void canvas.offsetHeight;
    
    const canvasRect = canvas.getBoundingClientRect();
    const scrollLeft = canvas.scrollLeft;
    const scrollTop = canvas.scrollTop;
    
    const validEdges: EdgeData[] = [];
    
    processRelationships.forEach(rel => {
      const sourceNode = nodeRefs.current.get(rel.sourceId);
      const targetNode = nodeRefs.current.get(rel.targetId);
      
      if (!sourceNode || !targetNode) return;
      
      const sourceRect = sourceNode.getBoundingClientRect();
      const targetRect = targetNode.getBoundingClientRect();
      
      // Skip if rectangles are invalid
      if (!sourceRect || !targetRect || 
          sourceRect.width <= 0 || sourceRect.height <= 0 ||
          targetRect.width <= 0 || targetRect.height <= 0) {
        return;
      }
      
      validEdges.push({
        id: rel.id,
        sourceId: rel.sourceId,
        targetId: rel.targetId,
        sourceDomRect: sourceRect,
        targetDomRect: targetRect
      });
    });

    setEdges(validEdges);
  }, [processRelationships]);

  // Use layoutEffect for more precise timing of measurements
  useLayoutEffect(() => {
    calculateEdges();
  }, [calculateEdges, forceUpdate, zoomLevel, panOffset]);
  
  // Set up observer to recalculate edges when needed
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const debouncedCalculateEdges = debounce(calculateEdges, 50);
    
    // Use ResizeObserver to detect size changes
    const resizeObserver = new ResizeObserver(debouncedCalculateEdges);
    resizeObserver.observe(container);
    
    // Handle more events that could affect positioning
    window.addEventListener('resize', debouncedCalculateEdges);
    window.addEventListener('transitionend', debouncedCalculateEdges);
    
    // Handle keyboard events for space bar panning
    const handleKeyDown = (e: KeyboardEvent) => {
      // Add space bar functionality for panning mode
      if (e.code === 'Space' && !e.repeat) {
        setIsSpaceKeyDown(true);
        if (containerRef.current) {
          containerRef.current.style.cursor = 'grab';
        }
        // Prevent default space behavior (like scrolling)
        e.preventDefault();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceKeyDown(false);
        if (isPanning) {
          setIsPanning(false);
        }
        if (containerRef.current) {
          containerRef.current.style.cursor = 'default';
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Add a wheel event listener at the document level to capture all wheel events
    const preventDefaultWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    
    container.addEventListener('wheel', preventDefaultWheel, { passive: false });
    
    // Initial calculation after a small delay to ensure DOM is ready
    setTimeout(calculateEdges, 100);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', debouncedCalculateEdges);
      window.removeEventListener('transitionend', debouncedCalculateEdges);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      container.removeEventListener('wheel', preventDefaultWheel);
    };
  }, [calculateEdges, isPanning, isSpaceKeyDown]);

  // Handle wheel event for zooming
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Determine zoom direction
    if (e.ctrlKey || e.metaKey) {
      // Prevent default browser zooming behavior
      e.preventDefault();
      
      const rect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
      const clientX = e.clientX;
      const clientY = e.clientY;
      
      // Calculate position relative to the container
      const x = (clientX - rect.left) / zoomLevel - panOffset.x;
      const y = (clientY - rect.top) / zoomLevel - panOffset.y;
      
      // Determine zoom direction and factor (for smoother zooming)
      const zoomFactor = 0.1;
      const direction = e.deltaY < 0 ? 1 : -1;
      
      // Update zoom level and pan offset
      setZoomLevel(prev => {
        const newZoom = Math.max(0.4, Math.min(3, prev + direction * zoomFactor));
        
        // Calculate scale change
        const scale = newZoom / prev;
        
        // Update pan offset to zoom toward/from mouse position
        setPanOffset({
          x: x - scale * (x - panOffset.x),
          y: y - scale * (y - panOffset.y)
        });
        
        // Force edge recalculation
        setTimeout(() => setForceUpdate(prev => prev + 1), 50);
        
        return newZoom;
      });
    }
  }, [zoomLevel, panOffset]);
  
  // SVG component for edge rendering with improved positioning
  const EdgesSVG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || edges.length === 0) return null;
    
    const canvasRect = canvas.getBoundingClientRect();
    
    return (
      <svg 
        className="edges-svg" 
        width="100%" 
        height="100%" 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          overflow: 'visible', 
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        {edges.map(edge => {
          if (!edge.sourceDomRect || !edge.targetDomRect) return null;
          
          // Calculate position relative to canvas with improved precision
          // Account for zoom and pan offset
          const sourceX = (edge.sourceDomRect.right - canvasRect.left) / zoomLevel;
          const sourceY = (edge.sourceDomRect.top + (edge.sourceDomRect.height/2) - canvasRect.top) / zoomLevel;
          const targetX = (edge.targetDomRect.left - canvasRect.left) / zoomLevel;
          const targetY = (edge.targetDomRect.top + (edge.targetDomRect.height/2) - canvasRect.top) / zoomLevel;
          
          // Skip drawing if positions aren't valid
          if (isNaN(sourceX) || isNaN(sourceY) || isNaN(targetX) || isNaN(targetY)) {
            return null;
          }
          
          // Normalize stroke width based on zoom level to maintain visual consistency
          const strokeWidth = Math.max(1, 2 / zoomLevel);
          
          // For straight line when nodes are roughly at the same height
          if (Math.abs(sourceY - targetY) <= 10) {
            return (
              <line
                key={edge.id}
                x1={sourceX}
                y1={sourceY}
                x2={targetX}
                y2={targetY}
                stroke="#9ca3af"
                strokeWidth={strokeWidth}
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
              strokeWidth={strokeWidth}
              fill="none"
            />
          );
        })}
      </svg>
    );
  }, [edges, zoomLevel]);

  return (
    <div 
      className={`process-graph-container ${isSpaceKeyDown ? 'space-key-down' : ''}`}
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={e => {
        if (e.ctrlKey || e.metaKey) {
          handleWheel(e);
          e.stopPropagation();
        }
      }}
    >
      <div className="process-graph-controls">
        <div className="zoom-controls">
          <button
            className="control-button zoom-in"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            +
          </button>
          <button
            className="control-button zoom-reset"
            onClick={handleZoomReset}
            title="Reset Zoom & Pan"
          >
            ↺
          </button>
          <button
            className="control-button zoom-out"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            -
          </button>
        </div>
        
        {onCreateState && (
          <button
            className="control-button add-state"
            onClick={() => handleOpenCreateForm(null)}
            title="Add New State"
          >
            Add State
          </button>
        )}
        
        <div className="process-graph-help-text">
          <div>Hold Space + Click and drag to pan</div>
          <div>Ctrl + Mouse wheel to zoom</div>
        </div>
      </div>
      
      <div className="process-graph-legend">
        <div className="legend-item">
          <span className="legend-icon open"></span> Open Process (active)
        </div>
        <div className="legend-item">
          <span className="legend-icon completed"></span> Completed Process (has next step)
        </div>
      </div>
      
      <div 
        className={`process-graph-canvas ${isPanning ? 'is-panning' : ''}`}
        ref={canvasRef}
        style={{
          transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: '0 0',
          height: `${100 / zoomLevel}%`,
          width: `${100 / zoomLevel}%`,
          cursor: getCursor(),
        }}
      >
        <EdgesSVG />
        
        {processes.length === 0 && (
          <div className="empty-message">No process data available</div>
        )}
        
        {processes.map(processData => {
          const isSelected = 
            state?.id === processData.startState.id || 
            state?.id === processData.endState?.id;
            
          // Find the end density for completed nodes
          let endDensity: number | null = null;
          if (processData.status === 'completed' && processData.endState) {
            // If the node is a parent, find its child's parent_end_density
            const childNode = processes.find(p => 
              p.startState.parent_id === processData.startState.id
            );
            if (childNode) {
              endDensity = childNode.startState.parameters?.transition_parameters?.parent_end_density || null;
            }
          }
            
          return (
            <div 
              key={processData.id}
              ref={node => setNodeRef(node, processData.id)}
              className={getNodeClass(processData.processType, processData.status, isSelected)}
              style={{
                left: `${processData.position.x}px`,
                top: `${processData.position.y}px`
              }}
              onClick={(e) => handleNodeClick(processData, e)}
              data-id={processData.id}
              data-parent-id={processData.parentId || ''}
            >
              <div className="process-node-header">
                {processData.processType.replace(/_/g, ' ')}
                <span className="process-status">
                  ({processData.status === 'open' ? 'active' : 'complete'})
                </span>
                <div className="node-actions">
                  <button 
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(processData.startState.id);
                    }}
                    title="Delete State"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="process-node-label">
                {processData.startState.name || `Process ${processData.startState.id}`}
              </div>
              
              {onCreateState && (
                <button 
                  className="add-child-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCreateForm(processData.startState);
                  }}
                  title="Add Child State"
                >
                  +
                </button>
              )}
              
              <div className="process-node-info">
                <div>
                  <span className="info-label">Started:</span> {new Date(processData.startState.timestamp).toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                
                {processData.endState && (
                  <div>
                    <span className="info-label">Completed:</span> {new Date(processData.endState.timestamp).toLocaleString(undefined, {
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
                
                <div>
                  <span className="info-label">{getParameterDisplayName('cell_density')}:</span> {(processData.startState.parameters?.cell_density ?? 0).toLocaleString()} cells/ml
                </div>

                {endDensity !== null && (
                  <div>
                    <span className="info-label">{getParameterDisplayName('end_density')}:</span> {endDensity.toLocaleString()} cells/ml
                  </div>
                )}

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
      
      {/* Add NodeDetailsPanel */}
      <NodeDetailsPanel 
        isOpen={detailsPanelOpen}
        node={selectedNode}
        onClose={handleCloseDetailsPanel}
      />
      
      {/* State creation modal */}
      {showCreateForm && onCreateState && (
        <div className="modal-overlay">
          <div className="modal-content state-form-modal">
            <div className="modal-header">
              <h2>{selectedParentForCreate ? `Create Child State for "${selectedParentForCreate.name}"` : 'Create New State'}</h2>
              <button className="modal-close" onClick={handleCreateStateCancel}>×</button>
            </div>
            <div className="modal-body">
              <CreateStateForm 
                onSubmit={handleCreateStateSubmit}
                onCancel={handleCreateStateCancel}
                existingStates={states}
                initialParentId={selectedParentForCreate?.id}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 