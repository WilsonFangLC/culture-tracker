import React, { useMemo, useState } from 'react';
import { CellState, useStates } from '../api';
import { useParameters } from '../components/ParameterUtils';

const RawListView: React.FC = () => {
  const { data: states, isLoading, error } = useStates();
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  // Get parameter utilities
  const { 
    parameterMetadata, 
    allPossibleParameters, 
    isParameterApplicable 
  } = useParameters();
  
  // Extract and flatten all parameters, including nested ones
  const { allParameterKeys, flattenedStates } = useMemo(() => {
    if (!states) return { 
      allParameterKeys: [...allPossibleParameters], 
      flattenedStates: []
    };
    
    const paramKeys = new Set<string>(allPossibleParameters);
    
    // Process states to extract all possible parameter keys and flatten nested structures
    const processed = states.map(state => {
      const flatState = { ...state };
      const flatParams: Record<string, any> = {};
      
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
    
    return {
      allParameterKeys: Array.from(paramKeys).sort(),
      flattenedStates: processed
    };
  }, [states, allPossibleParameters]);
  
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
  
  // Function to render parameter value with proper display
  const renderParameterValue = (state: any, paramKey: string): JSX.Element => {
    const operationType = state.flatParams.operation_type;
    
    // Check if this parameter applies to this operation type
    const isApplicable = isParameterApplicable(paramKey, operationType);
    
    // Get the value
    let value = state.flatParams[paramKey];
    
    // Special case for "end_density" - if not present in parent nodes, check if any of its children
    // have a parent_end_density that refers to this node
    if (paramKey === 'end_density' && (value === undefined || value === null)) {
      // Look for any child states that have this state as a parent
      const childStates = states ? states.filter(s => s.parent_id === state.id) : [];
      const childWithParentEndDensity = childStates.find(childState => 
        childState.parameters?.transition_parameters?.parent_end_density !== undefined
      );
      
      // If found, use the parent_end_density value from the child's transition parameters
      if (childWithParentEndDensity && childWithParentEndDensity.parameters?.transition_parameters?.parent_end_density) {
        value = childWithParentEndDensity.parameters.transition_parameters.parent_end_density;
      }
    }
    
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
  
  // Function to handle CSV export
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      
      // Use full URL to bypass any routing issues
      const apiUrl = `${import.meta.env.VITE_API_BASE || ''}/api/export/csv`;
      
      // Fetch the CSV data from the backend
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv,*/*'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();

      // Create a link to download the blob
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Suggest a filename for the download
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.setAttribute('download', `cell_states_export_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();

      // Clean up by removing the link and revoking the URL
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Failed to export CSV:", error);
      alert("Failed to export CSV. Check the console for details.");
    } finally {
      setIsExporting(false);
    }
  };
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return (
    <div className="p-4 m-4 bg-red-50 border border-red-300 rounded-md">
      <h2 className="text-lg font-semibold text-red-700 mb-2">Error loading data</h2>
      <p className="text-red-600 mb-4">{(error as Error).message}</p>
      <button 
        onClick={() => window.location.reload()}
        className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm"
      >
        Refresh Page
      </button>
    </div>
  );
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Raw List View</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className={`${
              isExporting ? 'bg-green-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
            } text-white py-2 px-4 rounded flex items-center`}
          >
            {isExporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              'Export CSV'
            )}
          </button>
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
                <th key={`param-${key}`} className={`border p-2 ${parameterMetadata[key]?.applicableToAllNodes ? 'bg-blue-700' : 'bg-purple-700'} text-white`}>
                  {parameterMetadata[key]?.displayName || key}
                  {!parameterMetadata[key]?.applicableToAllNodes && 
                    <div className="text-xs font-normal">
                      ({parameterMetadata[key]?.operationSpecific?.join(', ')})
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