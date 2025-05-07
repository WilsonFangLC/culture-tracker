import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { ProcessNodeData } from '../../utils/flowTransform';
import './ProcessNode.css';

function SimpleProcessNode({ data, selected }: NodeProps<ProcessNodeData>) {
  const { label, processType, status, startTime, endTime, parameters } = data;
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Format duration
  const getDuration = () => {
    if (!endTime) return 'Ongoing';
    
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    }
    return `${diffHours}h`;
  };
  
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
      {/* Node header */}
      <div className="node-header">
        <div className="node-icon">
          {processType === 'passage' && 'P'}
          {processType === 'freeze' && 'F'}
          {processType === 'thaw' && 'T'}
          {processType === 'split' && 'S'}
          {processType === 'start_new_culture' && 'N'}
          {processType === 'harvest' && 'H'}
          {!processType && '?'}
        </div>
        <div className="node-title">{label}</div>
      </div>
      
      {/* Node content */}
      <div className="node-content">
        <div className="node-parameter">
          <span className="parameter-label">Type:</span>
          <span className="parameter-value">{processType?.replace(/_/g, ' ') || 'Unknown'}</span>
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
          <span className="parameter-value">{getDuration()}</span>
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
    </div>
  );
}

export default memo(SimpleProcessNode); 