import React, { useState } from 'react';

interface DynamicParametersProps {
  parameters: Record<string, any>;
  onChange: (newParameters: Record<string, any>) => void;
  className?: string;
}

const DynamicParameters: React.FC<DynamicParametersProps> = ({ 
  parameters, 
  onChange,
  className = ''
}) => {
  const [newParamName, setNewParamName] = useState('');
  const [newParamValue, setNewParamValue] = useState('');

  const handleAddParameter = () => {
    if (!newParamName.trim()) {
      alert('Parameter name cannot be empty');
      return;
    }

    // Try to convert value to number if it looks like one
    let processedValue: string | number = newParamValue;
    if (/^-?\d+(\.\d+)?$/.test(newParamValue)) {
      processedValue = parseFloat(newParamValue);
    }

    const updatedParams = {
      ...parameters,
      [newParamName]: processedValue
    };
    
    onChange(updatedParams);
    setNewParamName('');
    setNewParamValue('');
  };

  const handleDeleteParameter = (key: string) => {
    const updatedParams = { ...parameters };
    delete updatedParams[key];
    onChange(updatedParams);
  };

  const handleUpdateValue = (key: string, value: string) => {
    // Try to convert value to number if it looks like one
    let processedValue: string | number = value;
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      processedValue = parseFloat(value);
    }

    onChange({
      ...parameters,
      [key]: processedValue
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-medium">Custom Parameters</h3>
      
      <div className="grid grid-cols-1 gap-4">
        {Object.entries(parameters).map(([key, value]) => (
          <div key={key} className="flex items-center space-x-2 border p-2 rounded bg-white">
            <div className="font-medium flex-1 text-gray-700">{key}:</div>
            <input
              type="text"
              value={value.toString()}
              onChange={(e) => handleUpdateValue(key, e.target.value)}
              className="border rounded px-2 py-1 w-1/2"
            />
            <button
              type="button"
              onClick={() => handleDeleteParameter(key)}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      
      <div className="flex items-end space-x-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">
            Parameter Name
          </label>
          <input
            type="text"
            value={newParamName}
            onChange={(e) => setNewParamName(e.target.value)}
            className="mt-1 block w-full border rounded shadow-sm py-2 px-3"
            placeholder="Enter parameter name"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">
            Value
          </label>
          <input
            type="text"
            value={newParamValue}
            onChange={(e) => setNewParamValue(e.target.value)}
            className="mt-1 block w-full border rounded shadow-sm py-2 px-3"
            placeholder="Enter value"
          />
        </div>
        <button
          type="button"
          onClick={handleAddParameter}
          className="bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600"
        >
          Add
        </button>
      </div>
    </div>
  );
};

export default DynamicParameters; 