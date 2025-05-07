import React, { useEffect, useState } from 'react';
import { CellState } from '../api';
import { ALL_PARAMETER_METADATA, OPERATION_PARAMETER_MAPPING } from '../utils/parameters';

interface NodeDetailsPanelProps {
  isOpen: boolean;
  node: CellState | null;
  onClose: () => void;
  states: CellState[]; // We still need states to check for children
  onStateUpdated?: () => void;
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

// Map legacy parameter names to new parameter names
const legacyToNewParamMap: Record<string, string> = {
  'growth_rate': 'hypothesized_growth_rate',
  'doubling_time': 'hypothesized_doubling_time',
  'density_limit': 'hypothesized_density_limit',
};

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({ 
  isOpen, 
  node, 
  onClose, 
  states
}) => {
  if (!node) return null;
  
  // Find all child states (we need this to check if any child states exist)
  const childStates = states.filter(s => s.parent_id === node.id);
  
  // Find the first non-measurement child state (if any)
  const hasNonMeasurementChild = childStates.some(s => 
    s.parameters?.transition_parameters?.operation_type !== 'measurement'
  );
  
  // Check if this node has any measured parameters
  const hasMeasuredParams = node.parameters && 
    Object.keys(node.parameters).some(key => key.startsWith('measured_'));
  
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
  
  // Map legacy parameters to new parameters if they exist and new ones don't
  Object.entries(legacyToNewParamMap).forEach(([legacyKey, newKey]) => {
    if (legacyKey in flatParams && !(newKey in flatParams)) {
      flatParams[newKey] = flatParams[legacyKey];
    }
  });
  
  // Get operation type
  const operationType = flatParams.operation_type;
  
  // Get all possible parameter keys
  const allParamKeys = Object.keys(ALL_PARAMETER_METADATA);
  
  // Create parameter groups for organized display
  const basicInfoParams = ['id', 'name', 'timestamp', 'parent_id', 'operation_type', 'additional_notes'];
  
  // Group global parameters by type
  const globalParamsHypothesized = allParamKeys.filter(key => 
    ALL_PARAMETER_METADATA[key]?.applicableToAllNodes && 
    isParameterApplicable(key, operationType) && 
    key.startsWith('hypothesized_')
  );
  
  const globalParamsMeasured = allParamKeys.filter(key => 
    ALL_PARAMETER_METADATA[key]?.applicableToAllNodes && 
    isParameterApplicable(key, operationType) && 
    key.startsWith('measured_')
  );
  
  const globalParamsOther = allParamKeys.filter(key => 
    ALL_PARAMETER_METADATA[key]?.applicableToAllNodes && 
    isParameterApplicable(key, operationType) && 
    !key.startsWith('hypothesized_') && 
    !key.startsWith('measured_') &&
    !key.endsWith('(Legacy)')
  );
  
  // Operation-specific parameters
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
        
        {/* Main parameters (non-hypothesized, non-measured) */}
        {globalParamsOther.length > 0 && (
          <div className="parameter-section">
            <h4>Global Parameters</h4>
            {globalParamsOther.map(paramKey => {
              const value = flatParams[paramKey];
              const displayName = ALL_PARAMETER_METADATA[paramKey]?.displayName || paramKey;
              
              let valueClass = "parameter-value";
              if (value === undefined || value === null || value === '') {
                valueClass += " not-provided";
              }
              
              return (
                <div key={paramKey} className="parameter-item">
                  <div className="parameter-label">{displayName}:</div>
                  <div className={valueClass}>
                    {(value === undefined || value === null || value === '') ? '-' : formatValue(value)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Hypothesized parameters */}
        {globalParamsHypothesized.length > 0 && (
          <div className="parameter-section">
            <h4>Hypothesized Growth Parameters</h4>
            {globalParamsHypothesized.map(paramKey => {
              const value = flatParams[paramKey];
              // For legacy values, try the legacy key first, then the new key
              const legacyKey = Object.entries(legacyToNewParamMap).find(([_, newKey]) => newKey === paramKey)?.[0];
              const effectiveValue = value ?? (legacyKey ? flatParams[legacyKey] : undefined);
              
              const displayName = ALL_PARAMETER_METADATA[paramKey]?.displayName || paramKey;
              
              let valueClass = "parameter-value";
              if (effectiveValue === undefined || effectiveValue === null || effectiveValue === '') {
                valueClass += " not-provided";
              }
              
              return (
                <div key={paramKey} className="parameter-item">
                  <div className="parameter-label">{displayName}:</div>
                  <div className={valueClass}>
                    {(effectiveValue === undefined || effectiveValue === null || effectiveValue === '') ? '-' : formatValue(effectiveValue)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Measured parameters section */}
        <div className="parameter-section">
          <h4>Measured Growth Parameters</h4>
          
          {hasMeasuredParams ? (
            // If node has measured parameters, display them
            globalParamsMeasured.map(paramKey => {
              const value = flatParams[paramKey];
              const displayName = ALL_PARAMETER_METADATA[paramKey]?.displayName || paramKey;
              
              let valueClass = "parameter-value";
              if (value === undefined || value === null || value === '') {
                valueClass += " not-provided";
              }
              
              return (
                <div key={paramKey} className="parameter-item">
                  <div className="parameter-label">{displayName}:</div>
                  <div className={valueClass}>
                    {(value === undefined || value === null || value === '') ? '-' : formatValue(value)}
                  </div>
                </div>
              );
            })
          ) : (
            // If no measured parameters, show appropriate message
            <div className="text-sm text-gray-500 my-2">
              {hasNonMeasurementChild ? 
                'Measured parameters will be calculated soon based on the observed growth.' : 
                'Measured growth parameters will be automatically calculated when a non-measurement child state is created.'}
            </div>
          )}
        </div>
        
        {/* Operation-specific parameters */}
        {operationSpecificParams.length > 0 && (
          <div className="parameter-section">
            <h4>Operation-Specific Parameters</h4>
            {operationSpecificParams.map(paramKey => {
              const value = flatParams[paramKey];
              const displayName = ALL_PARAMETER_METADATA[paramKey]?.displayName || paramKey;
              
              let valueClass = "parameter-value";
              if (value === undefined || value === null || value === '') {
                valueClass += " not-provided";
              }
              
              return (
                <div key={paramKey} className="parameter-item">
                  <div className="parameter-label">{displayName}:</div>
                  <div className={valueClass}>
                    {(value === undefined || value === null || value === '') ? '-' : formatValue(value)}
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