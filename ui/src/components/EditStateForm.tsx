import { useState, useEffect } from 'react'
import { CellState } from '../api'
import DynamicParameters from './DynamicParameters'
import { useParameters } from './ParameterUtils'

interface EditStateFormProps {
  state: CellState;
  onSubmit: (data: {
    parameters: Record<string, any>;
    additional_notes?: string;
  }) => void;
  onCancel: () => void;
}

export default function EditStateForm({ state, onSubmit, onCancel }: EditStateFormProps) {
  // Initialize with all parameters from the state, ensuring deep clone
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [additionalNotes, setAdditionalNotes] = useState('');
  
  // Get parameter utilities
  const { getParameterDisplayName, isParameterApplicable } = useParameters();
  
  // Get operation type from state
  const operationType = parameters?.transition_parameters?.operation_type;
  
  // Initialize form state from state prop and when state prop changes
  useEffect(() => {
    if (state) {
      // Deep clone the parameters to avoid modifying the original
      const clonedParams = JSON.parse(JSON.stringify(state.parameters || {}));
      setParameters(clonedParams);
      setAdditionalNotes(state.additional_notes || '');
    }
  }, [state]);

  // Handle number input change with proper validation
  const handleNumberChange = (key: string, value: string, multiplier = 1, updateFn?: (value: number) => void) => {
    if (value === '') {
      // Handle empty value
      setParameters(prev => ({ ...prev, [key]: null }));
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        setParameters(prev => ({ ...prev, [key]: numValue * multiplier }));
        // Call optional update function (used for linked fields like growth rate/doubling time)
        if (updateFn && numValue > 0) {
          updateFn(numValue);
        }
      }
    }
  };

  // Handle text input change
  const handleTextChange = (key: string, value: string) => {
    setParameters(prev => ({ ...prev, [key]: value }));
  };

  // Handle cell density change with conversion
  const handleCellDensityChange = (value: string) => {
    handleNumberChange('cell_density', value, 1000000);
  };

  // Handle end density change with conversion
  const handleEndDensityChange = (value: string) => {
    handleNumberChange('end_density', value, 1000000);
  };

  // Handle growth rate change with auto-update of doubling time
  const handleGrowthRateChange = (value: string) => {
    handleNumberChange('growth_rate', value, 1, (numValue) => {
      if (numValue > 0) {
        setParameters(prev => ({
          ...prev,
          doubling_time: Math.log(2) / numValue
        }));
      }
    });
  };

  // Handle doubling time change with auto-update of growth rate
  const handleDoublingTimeChange = (value: string) => {
    handleNumberChange('doubling_time', value, 1, (numValue) => {
      if (numValue > 0) {
        setParameters(prev => ({
          ...prev,
          growth_rate: Math.log(2) / numValue
        }));
      }
    });
  };

  // Handle form submission with validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Make a clean copy of the parameters
    const submissionParams = { ...parameters };
    
    // Ensure transition_parameters are preserved
    if (state.parameters?.transition_parameters && !submissionParams.transition_parameters) {
      submissionParams.transition_parameters = { ...state.parameters.transition_parameters };
    }
    
    // Submit the form
    console.log('Submitting form with parameters:', submissionParams);
    onSubmit({
      parameters: submissionParams,
      additional_notes: additionalNotes,
    });
  };

  // Function to determine if a field should be displayed based on operation type
  const shouldShowField = (paramKey: string) => {
    return isParameterApplicable(paramKey, operationType);
  };

  // Function to get display value for density fields (converting to millions)
  const getDensityDisplayValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return '';
    return (value / 1000000).toString();
  };

  // Custom parameters exclude these common ones
  const commonParameterKeys = [
    'temperature_c', 
    'volume_ml', 
    'location', 
    'cell_density',
    'start_viability', 
    'parent_end_viability', 
    'growth_rate', 
    'doubling_time',
    'end_density',
    'viability',
    'transition_parameters'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-white rounded-lg">
      {/* Warning message */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Warning:</strong> The editing features are still being updated and have not been thoroughly tested. 
              Please verify any changes after saving and report any issues you encounter.
            </p>
          </div>
        </div>
      </div>
      
      {/* Common Parameters Section */}
      <div className="space-y-5">
        <h4 className="font-medium text-lg border-b pb-2">Common Parameters</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cell Name (Display Only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Cell Name
            </label>
            <div className="mt-1 p-2 border rounded bg-gray-50">
              {state.name || `State ${state.id}`}
            </div>
          </div>

          {/* Operation Type (Display Only) */}
          {operationType && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Operation Type
              </label>
              <div className="mt-1 p-2 border rounded bg-gray-50 capitalize">
                {operationType.replace(/_/g, ' ')}
              </div>
            </div>
          )}

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {getParameterDisplayName('temperature_c')}
            </label>
            <input
              type="number"
              step="0.1"
              className="mt-1 w-full p-2 border rounded"
              value={parameters.temperature_c ?? ''}
              onChange={(e) => handleNumberChange('temperature_c', e.target.value)}
              placeholder="Temperature in celsius"
            />
          </div>

          {/* Volume */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {getParameterDisplayName('volume_ml')}
            </label>
            <input
              type="number"
              step="0.1"
              className="mt-1 w-full p-2 border rounded"
              value={parameters.volume_ml ?? ''}
              onChange={(e) => handleNumberChange('volume_ml', e.target.value)}
              placeholder="Volume in ml"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {getParameterDisplayName('location')}
            </label>
            <input
              type="text"
              className="mt-1 w-full p-2 border rounded"
              value={parameters.location || ''}
              onChange={(e) => handleTextChange('location', e.target.value)}
              placeholder="Storage location"
            />
          </div>

          {/* Cell Density */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {getParameterDisplayName('cell_density')} (million cells/ml)
            </label>
            <input
              type="number"
              step="0.001"
              className="mt-1 w-full p-2 border rounded"
              value={getDensityDisplayValue(parameters.cell_density)}
              onChange={(e) => handleCellDensityChange(e.target.value)}
              placeholder="e.g., 0.1 for 100,000 cells/ml"
            />
          </div>

          {/* End Density */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {getParameterDisplayName('end_density')} (million cells/ml)
            </label>
            <input
              type="number"
              step="0.001"
              className="mt-1 w-full p-2 border rounded"
              value={getDensityDisplayValue(parameters.end_density)}
              onChange={(e) => handleEndDensityChange(e.target.value)}
              placeholder="Final cell density"
            />
          </div>

          {/* Viability */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {getParameterDisplayName('viability')} (%)
            </label>
            <input
              type="number"
              min="0" 
              max="100"
              step="0.1"
              className="mt-1 w-full p-2 border rounded"
              value={parameters.viability ?? ''}
              onChange={(e) => handleNumberChange('viability', e.target.value)}
              placeholder="Cell viability percentage"
            />
          </div>

          {/* Start Viability */}
          {shouldShowField('start_viability') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {getParameterDisplayName('start_viability')} (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="mt-1 w-full p-2 border rounded"
                value={parameters.start_viability ?? ''}
                onChange={(e) => handleNumberChange('start_viability', e.target.value)}
                placeholder="Initial viability percentage"
              />
            </div>
          )}

          {/* Parent End Viability */}
          {shouldShowField('parent_end_viability') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {getParameterDisplayName('parent_end_viability')} (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="mt-1 w-full p-2 border rounded"
                value={parameters.parent_end_viability ?? ''}
                onChange={(e) => handleNumberChange('parent_end_viability', e.target.value)}
                placeholder="Parent final viability percentage"
              />
            </div>
          )}
        </div>

        {/* Growth Parameters Section */}
        <div className="mt-6">
          <h4 className="font-medium mb-3">Growth Parameters</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Growth Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {getParameterDisplayName('growth_rate')} (per hour)
              </label>
              <input
                type="number"
                step="0.001"
                className="mt-1 w-full p-2 border rounded"
                value={parameters.growth_rate ?? ''}
                onChange={(e) => handleGrowthRateChange(e.target.value)}
                placeholder="Growth rate per hour"
              />
              <p className="mt-1 text-xs text-gray-500">
                Linked with doubling time - changing one updates the other
              </p>
            </div>

            {/* Doubling Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {getParameterDisplayName('doubling_time')} (hours)
              </label>
              <input
                type="number"
                step="0.1"
                className="mt-1 w-full p-2 border rounded"
                value={parameters.doubling_time ?? ''}
                onChange={(e) => handleDoublingTimeChange(e.target.value)}
                placeholder="Time to double the population"
              />
            </div>

            {/* Density Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {getParameterDisplayName('density_limit')} (million cells/ml)
              </label>
              <input
                type="number"
                step="0.001"
                className="mt-1 w-full p-2 border rounded"
                value={parameters.density_limit ? parameters.density_limit / 1000000 : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setParameters(prev => ({ ...prev, density_limit: null }));
                  } else {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                      setParameters(prev => ({ ...prev, density_limit: numValue * 1000000 }));
                    }
                  }
                }}
                placeholder="Maximum cell density"
              />
            </div>

            {/* Measured Doubling Time (Read Only) */}
            {parameters.measured_doubling_time !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {getParameterDisplayName('measured_doubling_time')} (hours)
                </label>
                <input
                  type="number"
                  className="mt-1 w-full p-2 border rounded bg-gray-50"
                  value={parameters.measured_doubling_time ?? ''}
                  readOnly
                />
                <p className="mt-1 text-xs text-gray-500">
                  Calculated from growth data - cannot be manually edited
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Parameters - for any other parameters not explicitly handled above */}
      <DynamicParameters 
        parameters={Object.entries(parameters)
          .filter(([key]) => !commonParameterKeys.includes(key))
          .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})}
        onChange={(newCustomParams) => {
          // Merge the custom parameters with the common ones, preserving transition_parameters
          setParameters(prev => ({
            ...prev,
            ...newCustomParams
          }));
        }}
        className="mt-6"
      />

      {/* Additional Notes */}
      <div>
        <label htmlFor="additional_notes" className="block text-sm font-medium text-gray-700">
          Additional Notes
        </label>
        <textarea
          id="additional_notes"
          rows={3}
          className="mt-1 w-full p-2 border rounded"
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Add any additional information here..."
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <button
          type="button"
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
} 