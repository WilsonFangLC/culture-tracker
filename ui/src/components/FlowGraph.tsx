import React, { useCallback, useMemo, useState } from 'react';
import { CellState } from '../api';
import { transformToFlow } from '../utils/flowTransform';
import ProcessCreationModal from './ProcessCreationModal';
import './ProcessGraph.css';

interface FlowGraphProps {
  state: CellState | null;
  states: CellState[];
  onSelectState: (state: CellState) => void;
  onDeleteState: (stateId: number) => void;
  onCreateState: (data: any[]) => void;
}

export default function FlowGraph({ 
  state, 
  states, 
  onSelectState, 
  onDeleteState,
  onCreateState 
}: FlowGraphProps) {
  // Process the state data
  const { nodes, edges } = useMemo(() => {
    if (states.length) {
      return transformToFlow(states, state?.id);
    }
    return { nodes: [], edges: [] };
  }, [states, state]);
  
  // State for the context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string | null;
    stateId: number | null;
  } | null>(null);
  
  // State for the process creation modal
  const [creationModal, setCreationModal] = useState<{
    isOpen: boolean;
    parentState: CellState | null;
  }>({ isOpen: false, parentState: null });
  
  // State for drag status
  const [isDraggable, setIsDraggable] = useState(true);
  
  // Handle node click
  const handleNodeClick = useCallback((nodeId: string) => {
    // Extract the source state ID from the node
    const stateId = Number(nodeId.replace('node-', ''));
    const selectedState = states.find(s => s.id === stateId);
    
    if (selectedState) {
      onSelectState(selectedState);
    }
  }, [states, onSelectState]);

  // Handle node delete
  const handleDeleteNode = useCallback((stateId: number) => {
    if (window.confirm('Are you sure you want to delete this state?')) {
      onDeleteState(stateId);
    }
  }, [onDeleteState]);

  // Handle creating a child process
  const handleCreateChildProcess = useCallback((parentState: CellState) => {
    setCreationModal({
      isOpen: true,
      parentState
    });
  }, []);

  // Handle submitting the process creation form
  const handleProcessCreated = useCallback((data: any[]) => {
    onCreateState(data);
    setCreationModal({ isOpen: false, parentState: null });
  }, [onCreateState]);

  // Handle closing the process creation modal
  const handleCloseCreationModal = useCallback(() => {
    setCreationModal({ isOpen: false, parentState: null });
  }, []);
  
  // Handle node context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, nodeId: string, stateId: number) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodeId,
      stateId
    });
  }, []);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Auto layout feature (placeholder for future implementation)
  const handleAutoLayout = useCallback(() => {
    alert('Auto layout functionality will be implemented soon');
  }, []);
  
  // Render a node
  const renderNode = (node: any) => {
    const { id, data, position } = node;
    const { label, processType, status, startTime, endTime, parameters } = data;
    const isCompleted = status === 'completed';
    const isSelected = state?.id === Number(id.replace('node-', ''));
    
    // Extract relevant parameters for display
    const cellDensity = parameters?.cell_density 
      ? `${Number(parameters.cell_density).toLocaleString()} c/ml` 
      : 'N/A';
    
    const location = parameters?.location || 'N/A';
    
    // Format date for display
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };
    
    // Get process type color
    const getProcessColor = () => {
      switch (processType) {
        case 'passage': return '#3b82f6';
        case 'freeze': return '#2dd4bf';
        case 'thaw': return '#a855f7';
        case 'split': return '#f59e0b';
        case 'start_new_culture': return '#10b981';
        case 'harvest': return '#ef4444';
        default: return '#4b5563';
      }
    };

    // Get process type icon
    const getProcessIcon = () => {
      switch (processType) {
        case 'passage': return 'P';
        case 'freeze': return 'F';
        case 'thaw': return 'T';
        case 'split': return 'S';
        case 'start_new_culture': return 'N';
        case 'harvest': return 'H';
        default: return '?';
      }
    };
    
    return (
      <div 
        key={id}
        className={`process-node ${isCompleted ? 'completed' : 'ongoing'} ${isSelected ? 'selected' : ''}`}
        data-type={processType}
        onClick={() => handleNodeClick(id)}
        onContextMenu={(e) => handleContextMenu(e, id, Number(id.replace('node-', '')))}
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          width: '220px',
          padding: '12px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
          border: isCompleted ? '2px solid #4CAF50' : '2px dashed #2196F3',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
        }}
      >
        {/* Node header */}
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          marginBottom: '8px',
          borderBottom: '1px solid #eee',
          paddingBottom: '8px'
        }}>
          <div style={{
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: getProcessColor(),
            color: 'white',
            borderRadius: '50%',
            marginRight: '10px',
            fontWeight: 'bold',
          }}>
            {getProcessIcon()}
          </div>
          <div style={{
            fontWeight: 600,
            fontSize: '14px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>{label}</div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenu(e, id, Number(id.replace('node-', '')));
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#6b7280',
              padding: '2px 6px',
              borderRadius: '4px'
            }}
          >
            ⋮
          </button>
        </div>
        
        {/* Node content */}
        <div style={{ fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#6b7280', fontWeight: 500 }}>Type:</span>
            <span>{processType?.replace(/_/g, ' ') || 'Unknown'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#6b7280', fontWeight: 500 }}>Status:</span>
            <span>{status}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#6b7280', fontWeight: 500 }}>Started:</span>
            <span>{formatDate(startTime)}</span>
          </div>
          {isCompleted && endTime && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#6b7280', fontWeight: 500 }}>Ended:</span>
              <span>{formatDate(endTime)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#6b7280', fontWeight: 500 }}>Density:</span>
            <span>{cellDensity}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#6b7280', fontWeight: 500 }}>Location:</span>
            <span>{location}</span>
          </div>
        </div>
      </div>
    );
  };
  
  // Render an edge
  const renderEdge = (edge: any) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return null;
    
    const startX = sourceNode.position.x + 110; // center of source node
    const startY = sourceNode.position.y + 150; // bottom of source node
    const endX = targetNode.position.x + 110; // center of target node
    const endY = targetNode.position.y; // top of target node
    
    // Create a simple stepped path
    const midY = (startY + endY) / 2;
    const path = `M${startX},${startY} L${startX},${midY} L${endX},${midY} L${endX},${endY}`;
    
    return (
      <svg 
        key={edge.id} 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <path 
          d={path} 
          stroke="#94a3b8" 
          strokeWidth={2} 
          fill="none" 
        />
      </svg>
    );
  };
  
  return (
    <div 
      style={{ 
        width: '100%', 
        height: '600px', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px',
        position: 'relative',
        overflow: 'auto',
        backgroundColor: '#f8fafc'
      }}
      onClick={closeContextMenu}
    >
      {!states.length ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          No states available to display
        </div>
      ) : (
        <div style={{ position: 'relative', width: '2000px', height: '1000px' }}>
          {/* Render edges first so they appear behind nodes */}
          {edges.map(renderEdge)}
          
          {/* Render nodes */}
          {nodes.map(renderNode)}
        </div>
      )}
      
      {/* Context menu */}
      {contextMenu && (
        <div
          className="absolute bg-white shadow-lg rounded-md py-1 z-50"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            minWidth: '150px',
          }}
        >
          {contextMenu.stateId && (
            <div
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              onClick={() => {
                // Find the state to create a child from
                const parentState = states.find(s => s.id === contextMenu.stateId);
                if (parentState) {
                  handleCreateChildProcess(parentState);
                }
                closeContextMenu();
              }}
            >
              Create Child Process
            </div>
          )}
          
          <div
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-red-600"
            onClick={() => {
              if (contextMenu.stateId) {
                handleDeleteNode(contextMenu.stateId);
              }
              closeContextMenu();
            }}
          >
            Delete
          </div>
        </div>
      )}
      
      {/* Tools Panel */}
      <div className="absolute top-4 right-4">
        <div className="bg-white p-2 rounded shadow-md flex gap-2">
          <button
            className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            onClick={() => {
              setCreationModal({
                isOpen: true,
                parentState: null
              });
            }}
          >
            New Process
          </button>
          <button
            className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            onClick={handleAutoLayout}
          >
            Auto Layout
          </button>
          <button
            className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
            onClick={() => {
              setIsDraggable(!isDraggable);
            }}
          >
            {isDraggable ? 'Lock Nodes' : 'Unlock Nodes'}
          </button>
        </div>
      </div>
      
      {/* Process Creation Modal */}
      {creationModal.isOpen && (
        <ProcessCreationModal
          isOpen={creationModal.isOpen}
          onClose={handleCloseCreationModal}
          parentState={creationModal.parentState}
          existingStates={states}
          onCreateState={handleProcessCreated}
        />
      )}
    </div>
  );
} 