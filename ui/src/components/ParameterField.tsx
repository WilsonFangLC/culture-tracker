import React from 'react';
import { useParameters } from './ParameterUtils';

interface ParameterFieldProps {
  paramKey: string;
  value: any;
  onChange: (value: any) => void;
  operationType?: string;
  disabled?: boolean;
}

/**
 * A component that renders the appropriate form field for a parameter
 * based on its type and metadata.
 */
const ParameterField: React.FC<ParameterFieldProps> = ({
  paramKey,
  value,
  onChange,
  operationType,
  disabled = false
}) => {
  const { parameterMetadata, isParameterApplicable } = useParameters();
  
  // Check if parameter is applicable to this operation type
  const isApplicable = isParameterApplicable(paramKey, operationType);
  
  // If parameter is not applicable, don't render anything
  if (!isApplicable) {
    return null;
  }
  
  // Get parameter metadata
  const metadata = parameterMetadata[paramKey];
  if (!metadata) {
    console.warn(`No metadata found for parameter "${paramKey}"`);
    return null;
  }
  
  // Determine the field type based on the parameter name and value type
  let fieldType = 'text';
  
  // Special handling for known numeric fields
  const numericParams = [
    'temperature_c', 
    'volume_ml', 
    'cell_density', 
    'viability', 
    'growth_rate', 
    'doubling_time', 
    'density_limit', 
    'measured_doubling_time',
    'parent_end_density',
    'number_of_vials',
    'total_cells',
    'number_of_passages',
    'end_density',
    'measured_value'
  ];
  
  if (numericParams.includes(paramKey)) {
    fieldType = 'number';
  }
  
  // Special handling for specific parameters
  if (paramKey === 'viability') {
    // Viability is a percentage
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700">{metadata.displayName}</label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="number"
            min="0"
            max="100"
            step="any"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            disabled={disabled}
            className="block w-full p-2 pr-12 border rounded focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 95"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">%</span>
          </div>
        </div>
      </div>
    );
  }
  
  if (paramKey === 'cell_density' || paramKey === 'density_limit' || 
      paramKey === 'end_density' || paramKey === 'parent_end_density') {
    // Cell density is typically shown in million cells/ml
    const displayValue = value ? value / 1000000 : '';
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700">{metadata.displayName}</label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="number"
            step="any"
            min="0"
            value={displayValue}
            onChange={(e) => {
              const numVal = e.target.value ? Number(e.target.value) * 1000000 : undefined;
              onChange(numVal);
            }}
            disabled={disabled}
            className="block w-full p-2 pr-24 border rounded focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 1.5"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">million cells/ml</span>
          </div>
        </div>
      </div>
    );
  }
  
  // Render field based on type
  if (fieldType === 'number') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700">{metadata.displayName}</label>
        <input
          type="number"
          step="any"
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          disabled={disabled}
          className="mt-1 w-full p-2 border rounded"
          placeholder={`e.g., ${paramKey === 'temperature_c' ? '37' : '10'}`}
        />
      </div>
    );
  }
  
  // Default text field
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{metadata.displayName}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-1 w-full p-2 border rounded"
        placeholder={`Enter ${metadata.displayName.toLowerCase()}`}
      />
    </div>
  );
};

export default ParameterField; 