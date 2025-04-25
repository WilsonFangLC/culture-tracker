import { useState } from 'react'
import { CellState } from '../api'

interface EditStateFormProps {
  state: CellState;
  onSubmit: (data: {
    parameters: {
      status: string;
      temperature_c: number;
      volume_ml: number;
      location: string;
      cell_density: number;
      viability: number;
      storage_location: string;
    };
  }) => void;
  onCancel: () => void;
}

export default function EditStateForm({ state, onSubmit, onCancel }: EditStateFormProps) {
  const [formData, setFormData] = useState({
    status: state.parameters.status || '1',
    temperature_c: state.parameters.temperature_c || 0,
    volume_ml: state.parameters.volume_ml || 0,
    location: state.parameters.location || '',
    cell_density: state.parameters.cell_density || 0,
    viability: state.parameters.viability || 0,
    storage_location: state.parameters.storage_location || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submitting form with data:', formData)
    onSubmit({
      parameters: formData
    })
  }

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof formData) => {
    const value = e.target.value === '' ? 0 : parseFloat(e.target.value)
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg">
      <h3 className="text-lg font-semibold">Edit State {state.id}</h3>
      
      {/* Status Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          className="mt-1 w-full p-2 border rounded"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
        >
          <option value="1">Status 1</option>
          <option value="2">Status 2</option>
          <option value="3">Status 3</option>
          <option value="4">Status 4</option>
        </select>
      </div>

      {/* Cell Parameters */}
      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Cell Density (cells/ml)
          </label>
          <input
            type="number"
            min="0"
            className="mt-1 w-full p-2 border rounded"
            value={formData.cell_density}
            onChange={(e) => handleNumericChange(e, 'cell_density')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Viability (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            className="mt-1 w-full p-2 border rounded"
            value={formData.viability}
            onChange={(e) => handleNumericChange(e, 'viability')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Storage Location
          </label>
          <input
            type="text"
            className="mt-1 w-full p-2 border rounded"
            value={formData.storage_location}
            onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
          />
        </div>
      </div>

      {/* State Parameters */}
      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Temperature (°C)
          </label>
          <input
            type="number"
            className="mt-1 w-full p-2 border rounded"
            value={formData.temperature_c}
            onChange={(e) => handleNumericChange(e, 'temperature_c')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Volume (ml)
          </label>
          <input
            type="number"
            className="mt-1 w-full p-2 border rounded"
            value={formData.volume_ml}
            onChange={(e) => handleNumericChange(e, 'volume_ml')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <input
            type="text"
            className="mt-1 w-full p-2 border rounded"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
        </div>
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