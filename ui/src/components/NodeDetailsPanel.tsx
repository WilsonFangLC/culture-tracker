import React from 'react';
import { CellState } from '../api';
import { ALL_PARAMETER_METADATA, OPERATION_PARAMETER_MAPPING } from '../utils/parameters';

interface NodeDetailsPanelProps {
  isOpen: boolean;
  node: CellState | null;
  onClose: () => void;
}

// Helper function to determine if a parameter is applicable to a state based on operation type
const isParameterApplicable = (paramKey: string, operationType: string | undefined | null): boolean => {
  // If there's no operation type, assume all common parameters are applicable
  if (!operationType) {
    return ALL_PARAMETER_METADATA[paramKey]?.applicableToAllNodes || false;
  }
  
  // Check if the parameter is applicable to this operation type
  const applicableParams = OPERATION_PARAMETER_MAPPING[operationType as keyof typeof OPERATION_PARAMETER_MAPPING] || [];
  return applicableParams.includes(paramKey);
};

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
  
  // Get all possible parameter keys
  const allParamKeys = Object.keys(ALL_PARAMETER_METADATA);
  
  // Split parameters into global and operation-specific
  const globalParams = allParamKeys.filter(key => 
    ALL_PARAMETER_METADATA[key]?.applicableToAllNodes && 
    isParameterApplicable(key, operationType)
  );
  
  const operationSpecificParams = allParamKeys.filter(key => 
    !ALL_PARAMETER_METADATA[key]?.applicableToAllNodes && 
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
              const displayName = ALL_PARAMETER_METADATA[paramKey]?.displayName || paramKey;
              
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
        
        {operationSpecificParams.length > 0 && (
          <div className="parameter-section">
            <h4>Operation-Specific Parameters</h4>
            {operationSpecificParams.map(paramKey => {
              const value = flatParams[paramKey];
              const isApplicable = isParameterApplicable(paramKey, operationType);
              const displayName = ALL_PARAMETER_METADATA[paramKey]?.displayName || paramKey;
              
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