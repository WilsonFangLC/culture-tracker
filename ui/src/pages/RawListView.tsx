import React, { useMemo, useState } from 'react';
import { CellState, useStates, getExportCsvUrl } from '../api';

// Define the same comprehensive list of all possible parameters as in the backend
const ALL_POSSIBLE_PARAMETERS = [
  // Basic parameters
  "temperature_c", "volume_ml", "location", "cell_density", "viability",
  "growth_rate", "doubling_time", "density_limit", "storage_location",
  
  // Operation-specific parameters
  "cell_type", "parent_end_density", "number_of_vials", "total_cells",
  "number_of_passages", "end_density", "distribution", "measured_value"
];

// Define all possible transition parameters
const ALL_POSSIBLE_TRANSITION_PARAMETERS = [
  "operation_type", "cell_type", "parent_end_density", "number_of_vials", 
  "total_cells", "number_of_passages", "end_density", "distribution"
];

const RawListView: React.FC = () => {
  const { data: states, isLoading, error } = useStates();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Extract and flatten all parameters, including nested ones
  const { allParameterKeys, allTransitionParameterKeys, flattenedStates } = useMemo(() => {
    if (!states) return { 
      allParameterKeys: [...ALL_POSSIBLE_PARAMETERS], 
      allTransitionParameterKeys: [...ALL_POSSIBLE_TRANSITION_PARAMETERS],
      flattenedStates: []
    };
    
    const paramKeys = new Set<string>(ALL_POSSIBLE_PARAMETERS);
    const transitionParamKeys = new Set<string>(ALL_POSSIBLE_TRANSITION_PARAMETERS);
    
    // Debug output
    console.log('Processing states for parameters:', states);
    
    // Process states to extract all possible parameter keys and flatten nested structures
    const processed = states.map(state => {
      const flatState = { ...state };
      const flatParams: Record<string, any> = {};
      const transitionParams: Record<string, any> = {};
      
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
      
      // Extract transition parameters if they exist
      if (state.parameters?.transition_parameters) {
        console.log(`State ${state.id} transition params:`, state.parameters.transition_parameters);
        Object.entries(state.parameters.transition_parameters).forEach(([key, value]) => {
          transitionParamKeys.add(key);
          transitionParams[key] = value;
        });
      }
      
      return {
        ...flatState,
        flatParams,
        transitionParams
      };
    });
    
    console.log('Final parameter keys:', Array.from(paramKeys));
    console.log('Final transition parameter keys:', Array.from(transitionParamKeys));
    
    return {
      allParameterKeys: Array.from(paramKeys).sort(),
      allTransitionParameterKeys: Array.from(transitionParamKeys).sort(),
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
      
      // Search in transition parameters
      for (const [key, value] of Object.entries(state.transitionParams)) {
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
                <th key={`param-${key}`} className="border p-2 bg-blue-700 text-white">
                  {key}
                </th>
              ))}
              
              {/* Transition Parameter Headers */}
              {allTransitionParameterKeys.map(key => (
                <th key={`tp-${key}`} className="border p-2 bg-green-700 text-white">
                  TP: {key}
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
                <td className="border p-2">{state.parent_id || '-'}</td>
                <td className="border p-2">{state.transition_type || '-'}</td>
                <td className="border p-2">{state.additional_notes || state.notes || '-'}</td>
                
                {/* Parameters */}
                {allParameterKeys.map(key => (
                  <td key={`param-${key}-${state.id}`} className="border p-2">
                    {state.flatParams[key] !== undefined 
                      ? typeof state.flatParams[key] === 'object'
                        ? JSON.stringify(state.flatParams[key])
                        : String(state.flatParams[key])
                      : '-'}
                  </td>
                ))}
                
                {/* Transition Parameters */}
                {allTransitionParameterKeys.map(key => (
                  <td key={`tp-${key}-${state.id}`} className="border p-2">
                    {state.transitionParams[key] !== undefined 
                      ? typeof state.transitionParams[key] === 'object'
                        ? JSON.stringify(state.transitionParams[key])
                        : String(state.transitionParams[key])
                      : '-'}
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