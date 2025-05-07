import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ProcessNodeData } from '../../utils/flowTransform';
import './ProcessNode.css';

// Icons for different process types
const ProcessIcons: Record<string, React.ReactNode> = {
  passage: <span className="icon">P</span>,
  freeze: <span className="icon">F</span>,
  thaw: <span className="icon">T</span>,
  split: <span className="icon">S</span>,
  start_new_culture: <span className="icon">N</span>,
  harvest: <span className="icon">H</span>,
  default: <span className="icon">?</span>,
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return 'Ongoing';
  
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays > 0) {
    return `${diffDays}d ${diffHours}h`;
  }
  return `${diffHours}h`;
}

const ProcessNode = ({ data, selected }: NodeProps<ProcessNodeData>) => {
  const { label, processType, status, startTime, endTime, parameters } = data;
  
  // Choose the icon based on process type
  const icon = ProcessIcons[processType] || ProcessIcons.default;
  
  // Format duration for display
  const duration = formatDuration(startTime, endTime);
  
  // Determine the node status styles
  const isCompleted = status === 'completed';
  const statusClass = isCompleted ? 'completed' : 'ongoing';
  
  // Extract relevant parameters for display
  const cellDensity = parameters?.cell_density 
    ? `${Number(parameters.cell_density).toLocaleString()} c/ml` 
    : 'N/A';
  
  const location = parameters?.location || 'N/A';
  
  return (
    <div className={`process-node ${statusClass} ${selected ? 'selected' : ''}`} data-type={processType}>
      <Handle
        id="input"
        type="target"
        position={Position.Top}
        style={{ 
          width: '8px', 
          height: '8px', 
          top: '-6px',
          backgroundColor: '#64748b' 
        }}
      />
      
      {/* Node header */}
      <div className="node-header">
        <div className="node-icon">{icon}</div>
        <div className="node-title">{label}</div>
      </div>
      
      {/* Node content */}
      <div className="node-content">
        <div className="node-parameter">
          <span className="parameter-label">Type:</span>
          <span className="parameter-value">{processType.replace(/_/g, ' ')}</span>
        </div>
        <div className="node-parameter">
          <span className="parameter-label">Status:</span>
          <span className="parameter-value">{status}</span>
        </div>
        <div className="node-parameter">
          <span className="parameter-label">Started:</span>
          <span className="parameter-value">{formatDate(startTime)}</span>
        </div>
        {isCompleted && endTime && (
          <div className="node-parameter">
            <span className="parameter-label">Ended:</span>
            <span className="parameter-value">{formatDate(endTime)}</span>
          </div>
        )}
        <div className="node-parameter">
          <span className="parameter-label">Duration:</span>
          <span className="parameter-value">{duration}</span>
        </div>
        <div className="node-parameter">
          <span className="parameter-label">Density:</span>
          <span className="parameter-value">{cellDensity}</span>
        </div>
        <div className="node-parameter">
          <span className="parameter-label">Location:</span>
          <span className="parameter-value">{location}</span>
        </div>
      </div>
      
      {/* Context menu button */}
      <button className="node-menu-button">⋮</button>
      
      <Handle
        id="output"
        type="source"
        position={Position.Bottom}
        style={{ 
          width: '8px', 
          height: '8px',
          bottom: '-6px',
          backgroundColor: '#64748b' 
        }}
      />
    </div>
  );
};

export default memo(ProcessNode); 