import { useState, useEffect } from 'react'
import { useStates } from '../api'

interface CreateStateFormProps {
  onSubmit: (data: {
    timestamp: string;
    parent_id?: number;
    parameters: {
      status: string;
      temperature_c: number;
      volume_ml: number;
      location: string;
    };
    transition_type: string;
    transition_parameters: Record<string, any>;
  }) => void;
  onCancel: () => void;
}

export default function CreateStateForm({ onSubmit, onCancel }: CreateStateFormProps) {
  const { data: statesData } = useStates()
  const states = Array.isArray(statesData) ? statesData : []

  const [formData, setFormData] = useState({
    parent_id: states.length > 0 ? states[0].id : undefined,
    temperature_c: 37,
    volume_ml: 20,
    location: 'incubator',
    status: 'culturing',
    transition_type: '',
    transition_parameters: {},
  })

  const validTransitions = {
    'culturing': ['passage', 'freeze', 'measurement', 'idle'],
    'frozen': ['thaw'],
    'thawed': ['culturing', 'idle'],
    'idle': ['culturing', 'freeze']
  }

  const getAvailableTransitions = (currentStatus: string) => {
    return validTransitions[currentStatus as keyof typeof validTransitions] || []
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate transition
    const availableTransitions = getAvailableTransitions(formData.status)
    if (!availableTransitions.includes(formData.transition_type)) {
      alert('Invalid transition for current status')
      return
    }

    onSubmit({
      timestamp: new Date().toISOString(),
      parent_id: formData.parent_id,
      parameters: {
        status: formData.status,
        temperature_c: formData.temperature_c,
        volume_ml: formData.volume_ml,
        location: formData.location,
      },
      transition_type: formData.transition_type,
      transition_parameters: formData.transition_parameters,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg">
      <h3 className="text-lg font-semibold">Create New State</h3>
      
      {/* Parent State Selection */}
      {states.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Parent State
          </label>
          <select
            className="mt-1 w-full p-2 border rounded"
            value={formData.parent_id}
            onChange={(e) => setFormData({ ...formData, parent_id: Number(e.target.value) })}
          >
            {states.map((state) => (
              <option key={state.id} value={state.id}>
                State {state.id} ({state.parameters.status})
              </option>
            ))}
          </select>
        </div>
      )}

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
          <option value="culturing">Culturing</option>
          <option value="frozen">Frozen</option>
          <option value="thawed">Thawed</option>
          <option value="idle">Idle</option>
        </select>
      </div>

      {/* Transition Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Transition Type
        </label>
        <select
          className="mt-1 w-full p-2 border rounded"
          value={formData.transition_type}
          onChange={(e) => setFormData({ ...formData, transition_type: e.target.value })}
        >
          <option value="">Select a transition type</option>
          {getAvailableTransitions(formData.status).map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Transition Parameters */}
      {formData.transition_type === 'passage' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Split Ratio
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            className="mt-1 w-full p-2 border rounded"
            value={formData.transition_parameters.split_ratio || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                transition_parameters: {
                  ...formData.transition_parameters,
                  split_ratio: parseFloat(e.target.value),
                },
              })
            }
          />
        </div>
      )}

      {formData.transition_type === 'measurement' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Cell Density (cells/ml)
          </label>
          <input
            type="number"
            min="0"
            className="mt-1 w-full p-2 border rounded"
            value={formData.transition_parameters.cell_density || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                transition_parameters: {
                  ...formData.transition_parameters,
                  cell_density: parseFloat(e.target.value),
                },
              })
            }
          />
        </div>
      )}

      {/* State Parameters */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Temperature (°C)
        </label>
        <input
          type="number"
          className="mt-1 w-full p-2 border rounded"
          value={formData.temperature_c}
          onChange={(e) => setFormData({ ...formData, temperature_c: parseFloat(e.target.value) })}
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
          onChange={(e) => setFormData({ ...formData, volume_ml: parseFloat(e.target.value) })}
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
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Create State
        </button>
      </div>
    </form>
  )
} 