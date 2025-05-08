import React, { useMemo, useState } from 'react';
import { CellState, useStates, getExportCsvUrl } from '../api';

// Define operation types
type OperationType = 'start_new_culture' | 'passage' | 'freeze' | 'thaw' | 'measurement' | 'split' | 'harvest';

// Define which parameters apply to which operation types
const OPERATION_PARAMETER_MAPPING: Record<OperationType, string[]> = {
  start_new_culture: ['temperature_c', 'volume_ml', 'location', 'cell_density', 'viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'cell_type', 'operation_type'],
  passage: ['temperature_c', 'volume_ml', 'location', 'cell_density', 'viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'parent_end_density', 'cell_type', 'operation_type'],
  freeze: ['temperature_c', 'volume_ml', 'location', 'cell_density', 'viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'storage_location', 'parent_end_density', 'number_of_vials', 'total_cells', 'cell_type', 'operation_type'],
  thaw: ['temperature_c', 'volume_ml', 'location', 'cell_density', 'viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'number_of_passages', 'cell_type', 'operation_type'],
  measurement: ['temperature_c', 'volume_ml', 'location', 'cell_density', 'viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'measured_value', 'cell_type', 'operation_type'],
  split: ['temperature_c', 'volume_ml', 'location', 'cell_density', 'viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'parent_end_density', 'cell_type', 'operation_type'],
  harvest: ['temperature_c', 'volume_ml', 'location', 'viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'end_density', 'cell_type', 'operation_type'],
};

// Define all possible parameters with metadata
const ALL_PARAMETER_METADATA: Record<string, { 
  displayName: string; 
  applicableToAllNodes: boolean;
  operationSpecific?: OperationType[];
}> = {
  // Basic parameters that can apply to all nodes
  "temperature_c": { displayName: "Temperature (°C)", applicableToAllNodes: true },
  "volume_ml": { displayName: "Volume (ml)", applicableToAllNodes: true },
  "location": { displayName: "Location", applicableToAllNodes: true },
  "cell_density": { displayName: "Initial Cell Density", applicableToAllNodes: true },
  "viability": { displayName: "Viability (%)", applicableToAllNodes: true },
  "growth_rate": { displayName: "Hypothesized Growth Rate", applicableToAllNodes: true },
  "doubling_time": { displayName: "Hypothesized Doubling Time", applicableToAllNodes: true },
  "density_limit": { displayName: "Hypothesized Density Limit", applicableToAllNodes: true },
  "measured_doubling_time": { displayName: "Measured Doubling Time", applicableToAllNodes: true },
  "storage_location": { displayName: "Storage Location", applicableToAllNodes: false, operationSpecific: ['freeze'] },
  
  // Operation-specific parameters
  "cell_type": { displayName: "Cell Type", applicableToAllNodes: true, operationSpecific: ['start_new_culture'] },
  "parent_end_density": { displayName: "Parent End Density", applicableToAllNodes: false, operationSpecific: ['passage', 'freeze', 'split'] },
  "number_of_vials": { displayName: "Number of Vials", applicableToAllNodes: false, operationSpecific: ['freeze'] },
  "total_cells": { displayName: "Total Cells", applicableToAllNodes: false, operationSpecific: ['freeze'] },
  "number_of_passages": { displayName: "Number of Passages", applicableToAllNodes: false, operationSpecific: ['thaw'] },
  "end_density": { displayName: "End Density", applicableToAllNodes: false, operationSpecific: ['harvest'] },
  "measured_value": { displayName: "Measured Value", applicableToAllNodes: false, operationSpecific: ['measurement'] },
  
  // Former transition parameters, now regular parameters
  "operation_type": { displayName: "Operation Type", applicableToAllNodes: true },
};

// Get all possible parameter keys
const ALL_POSSIBLE_PARAMETERS = Object.keys(ALL_PARAMETER_METADATA);

const RawListView: React.FC = () => {
  const { data: states, isLoading, error } = useStates();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Extract and flatten all parameters, including nested ones
  const { allParameterKeys, flattenedStates } = useMemo(() => {
    if (!states) return { 
      allParameterKeys: [...ALL_POSSIBLE_PARAMETERS], 
      flattenedStates: []
    };
    
    const paramKeys = new Set<string>(ALL_POSSIBLE_PARAMETERS);
    
    // Debug output
    console.log('Processing states for parameters:', states);
    
    // Process states to extract all possible parameter keys and flatten nested structures
    const processed = states.map(state => {
      const flatState = { ...state };
      const flatParams: Record<string, any> = {};
      
      console.log(`Processing state ${state.id}, params:`, state.parameters);
      
      // Extract regular parameters
      if (state.parameters) {
        Object.entries(state.parameters).forEach(([key, value]) => {
          if (key !== 'transition_parameters') {
            paramKeys.add(key);
            flatParams[key] = value;
          }
        });
      }
      
      // Extract transition parameters if they exist and merge with regular parameters
      if (state.parameters?.transition_parameters) {
        console.log(`State ${state.id} transition params:`, state.parameters.transition_parameters);
        Object.entries(state.parameters.transition_parameters).forEach(([key, value]) => {
          // Don't overwrite existing params unless the value is empty or null
          if (!(key in flatParams) || flatParams[key] === null || flatParams[key] === '') {
            paramKeys.add(key);
            flatParams[key] = value;
          }
        });
      }
      
      return {
        ...flatState,
        flatParams
      };
    });
    
    console.log('Final parameter keys:', Array.from(paramKeys));
    
    return {
      allParameterKeys: Array.from(paramKeys).sort(),
      flattenedStates: processed
    };
  }, [states]);
  
  // Filter states based on search term
  const filteredStates = useMemo(() => {
    if (!flattenedStates.length) return [];
    if (!searchTerm) return flattenedStates;
    
    const term = searchTerm.toLowerCase();
    return flattenedStates.filter(state => {
      // Search in basic fields
      if (state.name?.toLowerCase().includes(term)) return true;
      if (state.id.toString().includes(term)) return true;
      if (state.additional_notes?.toLowerCase().includes(term)) return true;
      if (state.transition_type?.toLowerCase().includes(term)) return true;
      
      // Search in parameters
      for (const [key, value] of Object.entries(state.flatParams)) {
        if (
          key.toLowerCase().includes(term) || 
          String(value).toLowerCase().includes(term)
        ) {
          return true;
        }
      }
      
      return false;
    });
  }, [flattenedStates, searchTerm]);
  
  // Function to determine if a parameter is applicable to a state based on its operation type
  const isParameterApplicable = (paramKey: string, operationType: OperationType | undefined): boolean => {
    // If there's no operation type, assume all common parameters are applicable
    if (!operationType) {
      return ALL_PARAMETER_METADATA[paramKey]?.applicableToAllNodes || false;
    }
    
    // Check if the parameter is applicable to this operation type
    const applicableParams = OPERATION_PARAMETER_MAPPING[operationType] || [];
    return applicableParams.includes(paramKey);
  };
  
  // Function to render parameter value with proper display
  const renderParameterValue = (state: any, paramKey: string): JSX.Element => {
    const operationType = state.flatParams.operation_type as OperationType | undefined;
    
    // Check if this parameter applies to this operation type
    const isApplicable = isParameterApplicable(paramKey, operationType);
    
    // Get the value
    const value = state.flatParams[paramKey];
    
    if (!isApplicable) {
      // Parameter doesn't apply to this operation type
      return <span className="text-gray-400">N/A</span>;
    } else if (value === undefined || value === null || value === '') {
      // Parameter is applicable but not provided (optional)
      return <span className="text-yellow-500">-</span>;
    } else {
      // Parameter has a value
      // Special formatting for some parameter types
      if (paramKey === 'cell_type') {
        return <span className="font-medium text-green-700">{value}</span>;
      }
      return <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>;
    }
  };
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading data: {(error as Error).message}</div>;
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Raw List View</h1>
        <div className="flex gap-2">
          <a 
            href={getExportCsvUrl()} 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
          >
            Export CSV
          </a>
        </div>
      </div>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search for any value..."
          className="w-full p-2 border rounded"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="mb-4 bg-gray-100 p-3 rounded">
        <h3 className="font-medium mb-2">Legend:</h3>
        <ul className="text-sm">
          <li><span className="text-gray-400">N/A</span> - Parameter not applicable to this operation type</li>
          <li><span className="text-yellow-500">-</span> - Optional parameter not provided</li>
          <li className="mt-2">Column Header Colors:</li>
          <li><span className="inline-block w-3 h-3 bg-gray-800 mr-1"></span> Basic information (ID, Name, etc.)</li>
          <li><span className="inline-block w-3 h-3 bg-blue-700 mr-1"></span> Global parameters (apply to all operation types)</li>
          <li><span className="inline-block w-3 h-3 bg-purple-700 mr-1"></span> Operation-specific parameters</li>
        </ul>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border text-sm">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              {/* Basic State Information */}
              <th className="border p-2 bg-gray-800 text-white">ID</th>
              <th className="border p-2 bg-gray-800 text-white">Name</th>
              <th className="border p-2 bg-gray-800 text-white">Timestamp</th>
              <th className="border p-2 bg-gray-800 text-white">Parent ID</th>
              <th className="border p-2 bg-gray-800 text-white">Transition Type</th>
              <th className="border p-2 bg-gray-800 text-white">Notes</th>
              
              {/* Parameter Headers */}
              {allParameterKeys.map(key => (
                <th key={`param-${key}`} className={`border p-2 ${ALL_PARAMETER_METADATA[key]?.applicableToAllNodes ? 'bg-blue-700' : 'bg-purple-700'} text-white`}>
                  {ALL_PARAMETER_METADATA[key]?.displayName || key}
                  {!ALL_PARAMETER_METADATA[key]?.applicableToAllNodes && 
                    <div className="text-xs font-normal">
                      ({ALL_PARAMETER_METADATA[key]?.operationSpecific?.join(', ')})
                    </div>
                  }
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredStates.map(state => (
              <tr key={state.id} className="hover:bg-gray-50">
                {/* Basic State Information */}
                <td className="border p-2">{state.id}</td>
                <td className="border p-2">{state.name || '-'}</td>
                <td className="border p-2">{new Date(state.timestamp).toLocaleString()}</td>
                <td className="border p-2">{state.parent_id ? state.parent_id : 'No parent'}</td>
                <td className="border p-2">{state.transition_type || '-'}</td>
                <td className="border p-2">{state.additional_notes || state.notes || '-'}</td>
                
                {/* Parameters with NA/optional distinction */}
                {allParameterKeys.map(key => (
                  <td key={`param-${key}-${state.id}`} className="border p-2">
                    {renderParameterValue(state, key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RawListView; 