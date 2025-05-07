import { useState } from 'react'
import { CellState } from '../api'
import DynamicParameters from './DynamicParameters'

interface EditStateFormProps {
  state: CellState;
  onSubmit: (data: {
    parameters: Record<string, any>;
    additional_notes?: string;
  }) => void;
  onCancel: () => void;
}

export default function EditStateForm({ state, onSubmit, onCancel }: EditStateFormProps) {
  // Initialize with all parameters from the state
  const [parameters, setParameters] = useState<Record<string, any>>({ ...state.parameters });
  const [additionalNotes, setAdditionalNotes] = useState(state.additional_notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submitting form with parameters:', parameters)
    onSubmit({
      parameters,
      additional_notes: additionalNotes,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg">
      <h3 className="text-lg font-semibold">Edit State {state.id}</h3>
      
      {/* Common Parameters Section */}
      <div className="space-y-4">
        <h4 className="font-medium">Common Parameters</h4>
        
        {/* Temperature */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Temperature (°C)
          </label>
          <input
            type="number"
            className="mt-1 w-full p-2 border rounded"
            value={parameters.temperature_c ?? ''}
            onChange={(e) => {
              const value = e.target.value === '' ? null : parseFloat(e.target.value);
              setParameters({ ...parameters, temperature_c: value });
            }}
          />
        </div>

        {/* Volume */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Volume (ml)
          </label>
          <input
            type="number"
            className="mt-1 w-full p-2 border rounded"
            value={parameters.volume_ml ?? ''}
            onChange={(e) => {
              const value = e.target.value === '' ? null : parseFloat(e.target.value);
              setParameters({ ...parameters, volume_ml: value });
            }}
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <input
            type="text"
            className="mt-1 w-full p-2 border rounded"
            value={parameters.location || ''}
            onChange={(e) => setParameters({ ...parameters, location: e.target.value })}
          />
        </div>

        {/* Cell Density */}
        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">
              Initial Cell Density (cells/ml)
            </label>
            <input
              type="number"
              value={parameters.cell_density || ''}
              onChange={(e) => {
                const value = e.target.value === '' ? null : parseFloat(e.target.value);
                setParameters({ ...parameters, cell_density: value });
              }}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Viability */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Viability (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              className="mt-1 w-full p-2 border rounded"
              value={parameters.viability ?? ''}
              onChange={(e) => {
                const value = e.target.value === '' ? null : parseFloat(e.target.value);
                setParameters({ ...parameters, viability: value });
              }}
            />
          </div>
        </div>

        {/* Growth Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Growth Rate (per hour)
          </label>
          <input
            type="number"
            step="any"
            className="mt-1 w-full p-2 border rounded"
            value={parameters.growth_rate ?? ''}
            onChange={(e) => {
              const value = e.target.value === '' ? null : parseFloat(e.target.value);
              setParameters({ ...parameters, growth_rate: value });
              
              // Update doubling time if growth rate changes and is valid
              if (value && value > 0) {
                setParameters(prev => ({
                  ...prev,
                  growth_rate: value,
                  doubling_time: Math.log(2) / value
                }));
              } else {
                setParameters(prev => ({
                  ...prev,
                  growth_rate: value
                }));
              }
            }}
          />
        </div>

        {/* Doubling Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Doubling Time (hours)
          </label>
          <input
            type="number"
            step="any"
            className="mt-1 w-full p-2 border rounded"
            value={parameters.doubling_time ?? ''}
            onChange={(e) => {
              const value = e.target.value === '' ? null : parseFloat(e.target.value);
              
              // Update growth rate if doubling time changes and is valid
              if (value && value > 0) {
                setParameters(prev => ({
                  ...prev,
                  doubling_time: value,
                  growth_rate: Math.log(2) / value
                }));
              } else {
                setParameters(prev => ({
                  ...prev,
                  doubling_time: value
                }));
              }
            }}
          />
        </div>
      </div>

      {/* Dynamic Parameters */}
      <DynamicParameters 
        parameters={Object.entries(parameters)
          .filter(([key]) => !['temperature_c', 'volume_ml', 'location', 'cell_density', 
                              'viability', 'growth_rate', 'doubling_time'].includes(key))
          .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})}
        onChange={(newCustomParams) => {
          // Merge the custom parameters with the common ones
          setParameters({
            ...parameters,
            ...newCustomParams
          });
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
        />
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Save Changes
        </button>
      </div>
    </form>
  )
} 