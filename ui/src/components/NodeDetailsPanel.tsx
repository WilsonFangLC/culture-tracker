import React from 'react';
import { CellState } from '../api';
import { useParameters } from './ParameterUtils';

interface NodeDetailsPanelProps {
  isOpen: boolean;
  node: CellState | null;
  onClose: () => void;
}

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  
  if (typeof value === 'number') {
    // Format numbers with commas for thousands
    if (value > 1000) {
      return value.toLocaleString();
    }
    // Format small decimals with 4 decimal places
    if (value < 0.01 && value > 0) {
      return value.toFixed(4);
    }
    return value.toString();
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return value.toString();
};

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({ isOpen, node, onClose }) => {
  const { parameterMetadata, isParameterApplicable } = useParameters();
  
  if (!node) return null;
  
  // Extract all parameters from the node, combining regular and transition parameters
  const flatParams: Record<string, any> = { ...node.parameters };
  if (node.parameters?.transition_parameters) {
    Object.entries(node.parameters.transition_parameters).forEach(([key, value]) => {
      // Don't overwrite existing params unless the value is empty or null
      if (!(key in flatParams) || flatParams[key] === null || flatParams[key] === '') {
        flatParams[key] = value;
      }
    });
  }
  
  // Get operation type
  const operationType = flatParams.operation_type;
  
  // Get all possible parameter keys from context
  const allParamKeys = Object.keys(parameterMetadata);
  
  // Split parameters into global and operation-specific
  const globalParams = allParamKeys.filter(key => 
    parameterMetadata[key]?.applicableToAllNodes && 
    isParameterApplicable(key, operationType)
  );
  
  const operationSpecificParams = allParamKeys.filter(key => 
    !parameterMetadata[key]?.applicableToAllNodes && 
    isParameterApplicable(key, operationType)
  );
  
  return (
    <div className={`node-details-panel ${isOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <h3>{node.name || `Process ${node.id}`}</h3>
        <button className="panel-close" onClick={onClose}>×</button>
      </div>
      
      <div className="panel-content">
        <div className="parameter-section">
          <h4>Basic Information</h4>
          <div className="parameter-item">
            <div className="parameter-label">ID:</div>
            <div className="parameter-value">{node.id}</div>
          </div>
          <div className="parameter-item">
            <div className="parameter-label">Created:</div>
            <div className="parameter-value">{new Date(node.timestamp).toLocaleString()}</div>
          </div>
          <div className="parameter-item">
            <div className="parameter-label">Operation:</div>
            <div className="parameter-value">{operationType ? operationType.replace(/_/g, ' ') : 'None'}</div>
          </div>
          {node.parent_id && (
            <div className="parameter-item">
              <div className="parameter-label">Parent ID:</div>
              <div className="parameter-value">{node.parent_id}</div>
            </div>
          )}
          {node.additional_notes && (
            <div className="parameter-item">
              <div className="parameter-label">Notes:</div>
              <div className="parameter-value">{node.additional_notes}</div>
            </div>
          )}
        </div>
        
        {globalParams.length > 0 && (
          <div className="parameter-section">
            <h4>Global Parameters</h4>
            {globalParams.map(paramKey => {
              const value = flatParams[paramKey];
              const isApplicable = isParameterApplicable(paramKey, operationType);
              const displayName = parameterMetadata[paramKey]?.displayName || paramKey;
              
              let valueClass = "parameter-value";
              if (!isApplicable) {
                valueClass += " not-applicable";
              } else if (value === undefined || value === null || value === '') {
                valueClass += " not-provided";
              }
              
              return (
                <div key={paramKey} className="parameter-item">
                  <div className="parameter-label">{displayName}:</div>
                  <div className={valueClass}>
                    {!isApplicable ? 'N/A' : 
                      (value === undefined || value === null || value === '') ? '-' : 
                      formatValue(value)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Measured Doubling Time Section */}
        {flatParams.measured_doubling_time !== undefined && 
         flatParams.measured_doubling_time !== null && (
          <div className="parameter-section">
            <h4>Measured Growth Data</h4>
            <div className="parameter-item">
              <div className="parameter-label">Measured Doubling Time:</div>
              <div className="parameter-value highlight-measured">
                {formatValue(flatParams.measured_doubling_time)} hours
              </div>
              {flatParams.doubling_time && (
                <div className="parameter-comparison">
                  (Hypothesized: {formatValue(flatParams.doubling_time)} hours)
                </div>
              )}
            </div>
            <div className="parameter-note">
              <small>Calculated from actual growth data between initial and final cell densities</small>
            </div>
          </div>
        )}
        
        {operationSpecificParams.length > 0 && (
          <div className="parameter-section">
            <h4>Operation-Specific Parameters</h4>
            {operationSpecificParams.map(paramKey => {
              const value = flatParams[paramKey];
              const isApplicable = isParameterApplicable(paramKey, operationType);
              const displayName = parameterMetadata[paramKey]?.displayName || paramKey;
              
              let valueClass = "parameter-value";
              if (!isApplicable) {
                valueClass += " not-applicable";
              } else if (value === undefined || value === null || value === '') {
                valueClass += " not-provided";
              }
              
              return (
                <div key={paramKey} className="parameter-item">
                  <div className="parameter-label">{displayName}:</div>
                  <div className={valueClass}>
                    {!isApplicable ? 'N/A' : 
                      (value === undefined || value === null || value === '') ? '-' : 
                      formatValue(value)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeDetailsPanel; 