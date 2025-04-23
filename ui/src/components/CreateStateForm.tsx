import { useState, useEffect } from 'react'
import { useStates } from '../api'

interface CreateStateFormProps {
  onSubmit: (data: {
    name: string;
    timestamp: string;
    parent_id?: number;
    parameters: {
      status: string;
      temperature_c: number;
      volume_ml: number;
      location: string;
      cell_density: number;
      viability: number;
      split_ratio: number;
      storage_location: string;
    };
    transition_parameters: {
      status?: string;
      temperature_c?: number;
      volume_ml?: number;
      location?: string;
      cell_density?: number;
      viability?: number;
      split_ratio?: number;
      storage_location?: string;
    };
  }[]) => void;
  onCancel: () => void;
}

export default function CreateStateForm({ onSubmit, onCancel }: CreateStateFormProps) {
  const { data: statesData } = useStates()
  const states = Array.isArray(statesData) ? statesData : []

  const [formData, setFormData] = useState({
    name: "",
    parent_id: undefined as number | undefined,
    temperature_c: 37,
    volume_ml: 20,
    location: 'incubator',
    status: '1',
    cell_density: 0,
    viability: 100,
    split_ratio: 1,
    storage_location: '',
    transition_parameters: {} as Record<string, any>,
  })

  const [splitStates, setSplitStates] = useState<Array<{
    name: string;
    status: string;
    temperature_c: number;
    volume_ml: number;
    location: string;
    cell_density: number;
    viability: number;
    split_ratio: number;
    storage_location: string;
    distribution: number;
  }>>([])

  // Get the parent state's parameters
  const parentState = states.find(s => s.id === formData.parent_id)
  const parentParameters = parentState?.parameters || {}

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (splitStates.length > 0) {
      // Validate total distribution
      const totalDistribution = splitStates.reduce((sum, state) => sum + state.distribution, 0)
      if (totalDistribution !== 100) {
        alert('Total distribution must equal 100%')
        return
      }

      // Create states for each split
      const states = splitStates.map(state => ({
        name: state.name,
        timestamp: new Date().toISOString(),
        parent_id: formData.parent_id,
        parameters: {
          status: state.status,
          temperature_c: state.temperature_c,
          volume_ml: state.volume_ml,
          location: state.location,
          cell_density: state.cell_density,
          viability: state.viability,
          split_ratio: state.split_ratio,
          storage_location: state.storage_location,
        },
        transition_parameters: formData.transition_parameters,
      }))
      onSubmit(states)
    } else {
      // Single state creation
      onSubmit([{
        name: formData.name,
        timestamp: new Date().toISOString(),
        parent_id: formData.parent_id,
        parameters: {
          status: formData.status,
          temperature_c: formData.temperature_c,
          volume_ml: formData.volume_ml,
          location: formData.location,
          cell_density: formData.cell_density,
          viability: formData.viability,
          split_ratio: formData.split_ratio,
          storage_location: formData.storage_location,
        },
        transition_parameters: formData.transition_parameters,
      }])
    }
  }

  const addSplitState = () => {
    setSplitStates([...splitStates, {
      name: "",
      status: '1',
      temperature_c: 37,
      volume_ml: 20,
      location: 'incubator',
      cell_density: 0,
      viability: 100,
      split_ratio: 1,
      storage_location: '',
      distribution: 0,
    }])
  }

  const removeSplitState = (index: number) => {
    setSplitStates(splitStates.filter((_, i) => i !== index))
  }

  const updateSplitState = (index: number, field: string, value: any) => {
    const newSplitStates = [...splitStates]
    newSplitStates[index] = { ...newSplitStates[index], [field]: value }
    setSplitStates(newSplitStates)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg">
      <h3 className="text-lg font-semibold">Create New State</h3>
      
      {/* State Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          State Name
        </label>
        <input
          type="text"
          className="mt-1 w-full p-2 border rounded"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter a descriptive name for this state"
          required
        />
      </div>

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
              State {state.id} (Status {state.parameters.status})
            </option>
          ))}
        </select>
      </div>

      {/* Transition Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Transition Type
        </label>
        <select
          className="mt-1 w-full p-2 border rounded"
          value={splitStates.length > 0 ? 'split' : 'single'}
          onChange={(e) => {
            if (e.target.value === 'single') {
              setSplitStates([])
            } else {
              addSplitState()
            }
          }}
        >
          <option value="single">Single Transition (A → B)</option>
          <option value="split">Split Transition (A → B + C)</option>
        </select>
      </div>

      {splitStates.length > 0 ? (
        // Split Transition Form
        <div className="space-y-4">
          {splitStates.map((state, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium">Split State {index + 1}</h4>
                <button
                  type="button"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => removeSplitState(index)}
                >
                  Remove
                </button>
              </div>

              {/* Split State Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  State Name
                </label>
                <input
                  type="text"
                  className="mt-1 w-full p-2 border rounded"
                  value={state.name}
                  onChange={(e) => updateSplitState(index, 'name', e.target.value)}
                  placeholder="Enter a descriptive name for this split state"
                  required
                />
              </div>

              {/* Distribution */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Distribution (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className="mt-1 w-full p-2 border rounded"
                  value={state.distribution}
                  onChange={(e) => updateSplitState(index, 'distribution', parseFloat(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    className="mt-1 w-full p-2 border rounded"
                    value={state.status}
                    onChange={(e) => updateSplitState(index, 'status', e.target.value)}
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
                      value={state.cell_density}
                      onChange={(e) => updateSplitState(index, 'cell_density', parseFloat(e.target.value))}
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
                      value={state.viability}
                      onChange={(e) => updateSplitState(index, 'viability', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Split Ratio
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      className="mt-1 w-full p-2 border rounded"
                      value={state.split_ratio}
                      onChange={(e) => updateSplitState(index, 'split_ratio', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Storage Location
                    </label>
                    <input
                      type="text"
                      className="mt-1 w-full p-2 border rounded"
                      value={state.storage_location}
                      onChange={(e) => updateSplitState(index, 'storage_location', e.target.value)}
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
                      value={state.temperature_c}
                      onChange={(e) => updateSplitState(index, 'temperature_c', parseFloat(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Volume (ml)
                    </label>
                    <input
                      type="number"
                      className="mt-1 w-full p-2 border rounded"
                      value={state.volume_ml}
                      onChange={(e) => updateSplitState(index, 'volume_ml', parseFloat(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Location
                    </label>
                    <input
                      type="text"
                      className="mt-1 w-full p-2 border rounded"
                      value={state.location}
                      onChange={(e) => updateSplitState(index, 'location', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            onClick={addSplitState}
          >
            Add Another Split State
          </button>
        </div>
      ) : (
        // Single Transition Form (existing code)
        <>
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
                onChange={(e) => setFormData({ ...formData, cell_density: parseFloat(e.target.value) })}
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
                onChange={(e) => setFormData({ ...formData, viability: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Split Ratio
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                className="mt-1 w-full p-2 border rounded"
                value={formData.split_ratio}
                onChange={(e) => setFormData({ ...formData, split_ratio: parseFloat(e.target.value) })}
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
          </div>
        </>
      )}

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
          Create State{splitStates.length > 0 ? 's' : ''}
        </button>
      </div>
    </form>
  )
} 