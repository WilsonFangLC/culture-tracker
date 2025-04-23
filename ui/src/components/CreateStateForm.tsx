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
    transition_parameters: {
      status?: string;
      temperature_c?: number;
      volume_ml?: number;
      location?: string;
      split_ratio?: number;
      cell_density?: number;
      viability?: number;
      storage_location?: string;
    };
  }) => void;
  onCancel: () => void;
}

export default function CreateStateForm({ onSubmit, onCancel }: CreateStateFormProps) {
  const { data: statesData } = useStates()
  const states = Array.isArray(statesData) ? statesData : []

  const [formData, setFormData] = useState({
    parent_id: undefined as number | undefined,
    temperature_c: 37,
    volume_ml: 20,
    location: 'incubator',
    status: 'culturing',
    transition_parameters: {} as Record<string, any>,
  })

  // Get the parent state's parameters
  const parentState = states.find(s => s.id === formData.parent_id)
  const parentParameters = parentState?.parameters || {}

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Calculate which parameters changed
    const changedParameters: Record<string, any> = {}
    if (formData.status !== parentParameters.status) {
      changedParameters.status = formData.status
    }
    if (formData.temperature_c !== parentParameters.temperature_c) {
      changedParameters.temperature_c = formData.temperature_c
    }
    if (formData.volume_ml !== parentParameters.volume_ml) {
      changedParameters.volume_ml = formData.volume_ml
    }
    if (formData.location !== parentParameters.location) {
      changedParameters.location = formData.location
    }

    // Add any additional transition parameters
    Object.entries(formData.transition_parameters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        changedParameters[key] = value
      }
    })

    onSubmit({
      timestamp: new Date().toISOString(),
      parent_id: formData.parent_id,
      parameters: {
        status: formData.status,
        temperature_c: formData.temperature_c,
        volume_ml: formData.volume_ml,
        location: formData.location,
      },
      transition_parameters: changedParameters,
    })
  }

  // Determine which additional fields to show based on the status change
  const showAdditionalFields = () => {
    if (!parentState) return 'new_cell_line'
    const oldStatus = parentState.parameters.status
    const newStatus = formData.status

    if (oldStatus === 'culturing' && newStatus === 'frozen') {
      return 'freeze'
    }
    if (oldStatus === 'frozen' && newStatus === 'thawed') {
      return 'thaw'
    }
    if (oldStatus === 'culturing' && newStatus === 'culturing') {
      return 'passage'
    }
    if (newStatus === 'culturing') {
      return 'measurement'
    }
    return 'parameter_change'
  }

  const additionalFieldsType = showAdditionalFields()

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg">
      <h3 className="text-lg font-semibold">Create New State</h3>
      
      {/* Parent State Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Parent State (Optional)
        </label>
        <select
          className="mt-1 w-full p-2 border rounded"
          value={formData.parent_id || ''}
          onChange={(e) => setFormData({ ...formData, parent_id: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">New Cell Line</option>
          {states.map((state) => (
            <option key={state.id} value={state.id}>
              State {state.id} ({state.parameters.status})
            </option>
          ))}
        </select>
      </div>

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

      {/* Additional Fields based on Status Change */}
      {additionalFieldsType === 'new_cell_line' && (
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Initial Cell Density (cells/ml)
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
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Initial Viability (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              className="mt-1 w-full p-2 border rounded"
              value={formData.transition_parameters.viability || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  transition_parameters: {
                    ...formData.transition_parameters,
                    viability: parseFloat(e.target.value),
                  },
                })
              }
            />
          </div>
        </div>
      )}

      {additionalFieldsType === 'passage' && (
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

      {additionalFieldsType === 'measurement' && (
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

      {additionalFieldsType === 'freeze' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Storage Location
          </label>
          <input
            type="text"
            className="mt-1 w-full p-2 border rounded"
            value={formData.transition_parameters.storage_location || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                transition_parameters: {
                  ...formData.transition_parameters,
                  storage_location: e.target.value,
                },
              })
            }
          />
        </div>
      )}

      {additionalFieldsType === 'thaw' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Viability (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            className="mt-1 w-full p-2 border rounded"
            value={formData.transition_parameters.viability || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                transition_parameters: {
                  ...formData.transition_parameters,
                  viability: parseFloat(e.target.value),
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