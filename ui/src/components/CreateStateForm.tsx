import { useState, useEffect } from 'react'
import { CellState, CellStateCreate } from '../api'

interface CreateStateFormProps {
  onSubmit: (data: Array<{
    name: string;
    timestamp: string;
    parent_id?: number;
    parameters: CellStateCreate['parameters'];
    transition_type?: 'single' | 'split' | 'measurement';
    transition_parameters?: Record<string, any>; 
  }>) => void;
  onCancel: () => void;
  existingStates: CellState[];
}

// Define parameter keys for measurement dropdown
const measurableParameters: Array<keyof CellStateCreate['parameters']> = [
  'status',
  'temperature_c',
  'volume_ml',
  'location',
  'cell_density',
  'viability',
  // 'split_ratio' and 'storage_location' might not make sense to "measure"
  // but can be included if needed.
];

export default function CreateStateForm({ onSubmit, onCancel, existingStates }: CreateStateFormProps) {
  const states = existingStates;

  // Add state for the selected transition type
  const [transitionType, setTransitionType] = useState<'single' | 'split' | 'measurement'>('single');

  // Get current datetime in local timezone for default input value
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); // Adjust for local timezone
  const defaultDateTimeLocal = now.toISOString().slice(0, 16); // Format YYYY-MM-DDTHH:mm

  const [manualTimestamp, setManualTimestamp] = useState<string>(defaultDateTimeLocal);

  const [formData, setFormData] = useState({
    name: "",
    parent_id: undefined as number | undefined,
    temperature_c: 37,
    volume_ml: 20,
    location: 'incubator',
    status: '1',
    cell_density: 0,
    viability: 100,
    storage_location: '',
    // transition_parameters: {} as Record<string, any>, // transition_parameters is less needed now
  });

  // State for measurement transition
  const [measuredParameter, setMeasuredParameter] = useState<keyof CellStateCreate['parameters']>(measurableParameters[0]);
  const [measuredValue, setMeasuredValue] = useState<string | number>('');


  const [splitStates, setSplitStates] = useState<Array<{
    name: string;
    status: string;
    temperature_c: number;
    volume_ml: number;
    location: string;
    cell_density: number;
    viability: number;
    storage_location: string;
    distribution: number;
  }>>([])

  // Get the parent state's parameters - ensure it updates when parent_id changes
  const parentState = states.find(s => s.id === formData.parent_id);
  // Provide default empty object if no parent or parent has no parameters
  const parentParameters = parentState?.parameters || {}; 


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // --- Time Validation ---
    if (!manualTimestamp) {
      alert('Please enter the state time.');
      return;
    }
    const newTimestamp = new Date(manualTimestamp);
    if (isNaN(newTimestamp.getTime())) {
        alert('Invalid date/time format.');
        return;
    }

    if (parentState) {
        const parentTimestamp = new Date(parentState.timestamp);
        if (newTimestamp <= parentTimestamp) {
            alert(`The new state's time (${newTimestamp.toLocaleString()}) must be later than the parent state's time (${parentTimestamp.toLocaleString()}).`);
            return;
        }
    }
    // --- End Time Validation ---


    const basePayload = {
      name: formData.name,
      timestamp: newTimestamp.toISOString(), // Use validated manual timestamp
      parent_id: formData.parent_id,
      // transition_parameters: formData.transition_parameters, // Removed for now
    };

    if (transitionType === 'split') {
      if (splitStates.length === 0) {
         alert('Please add at least one state for a split transition.');
         return;
      }
      // Validate total distribution
      const totalDistribution = splitStates.reduce((sum, state) => sum + state.distribution, 0)
      if (totalDistribution !== 100) {
        alert('Total distribution must equal 100%')
        return
      }

      // Create states for each split
      const statesToSubmit = splitStates.map(state => ({
        ...basePayload, // Use base payload
        name: state.name, // Override name
        parameters: { // Use split state parameters
          status: state.status,
          temperature_c: state.temperature_c,
          volume_ml: state.volume_ml,
          location: state.location,
          cell_density: state.cell_density,
          viability: state.viability,
          storage_location: state.storage_location,
        },
        transition_type: 'split' as 'split', // Explicitly cast transition type
      }));
      onSubmit(statesToSubmit)

    } else if (transitionType === 'measurement') {
      if (!formData.parent_id) {
        alert('A parent state must be selected for a measurement transition.');
        return;
      }
      if (!parentState) {
         alert('Selected parent state not found.'); // Should ideally not happen
         return;
      }
       if (measuredValue === '') {
         alert('Please enter the measured value.');
         return;
       }

      // Create new parameters based on parent, overriding the measured one
      const newParameters = { ...parentParameters };
      
      // Basic type handling for measured value
      let finalMeasuredValue: string | number = measuredValue;
      if (typeof newParameters[measuredParameter] === 'number') {
        finalMeasuredValue = parseFloat(String(measuredValue));
        if (isNaN(finalMeasuredValue)) {
          alert(`Invalid number format for ${measuredParameter}.`);
          return;
        }
      } else {
         finalMeasuredValue = String(measuredValue); // Ensure it's a string otherwise
      }

      newParameters[measuredParameter] = finalMeasuredValue;

      onSubmit([{
        ...basePayload,
        parameters: newParameters as CellStateCreate['parameters'], // Assert type after modification
        transition_type: 'measurement',
      }]);

    } else { // Single transition
      onSubmit([{
        ...basePayload,
        parameters: {
          status: formData.status,
          temperature_c: formData.temperature_c,
          volume_ml: formData.volume_ml,
          location: formData.location,
          cell_density: formData.cell_density,
          viability: formData.viability,
          storage_location: formData.storage_location,
        },
        transition_type: 'single',
      }]);
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
              State {state.id} ({state.name || 'Unnamed'} - Status {state.parameters?.status || 'N/A'})
            </option>
          ))}
        </select>
      </div>

      {/* Manual Timestamp Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          State Time (Experimental Time)
        </label>
        <input
          type="datetime-local"
          className="mt-1 w-full p-2 border rounded"
          value={manualTimestamp}
          onChange={(e) => setManualTimestamp(e.target.value)}
          required
        />
      </div>

      {/* Transition Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Transition Type
        </label>
        <select
          className="mt-1 w-full p-2 border rounded"
          value={transitionType} // Use state variable for value
          onChange={(e) => {
            const newType = e.target.value as typeof transitionType;
            setTransitionType(newType);
            if (newType === 'split') {
              // Add initial state if switching to split and none exist
              if (splitStates.length === 0) {
                 addSplitState();
              }
            } else {
              // Clear split states if switching away from split
              setSplitStates([]);
            }
            // Reset measurement fields if not measurement type
            if (newType !== 'measurement') {
              setMeasuredParameter(measurableParameters[0]);
              setMeasuredValue('');
            }
          }}
        >
          <option value="single">Single Transition (A → B)</option>
          <option value="split">Split Transition (A → B + C)</option>
          <option value="measurement">Measurement (A → A')</option> {/* Add measurement option */}
        </select>
      </div>

      {/* Measurement Inputs - Conditionally Rendered */}
      {transitionType === 'measurement' && (
        <div className="p-4 border rounded-lg bg-blue-50 space-y-3">
           <h4 className="font-medium text-gray-800">Measurement Details</h4>
           {!formData.parent_id && (
             <p className="text-sm text-red-600">Please select a parent state for measurement.</p>
           )}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Parameter to Measure
            </label>
            <select
              className="mt-1 w-full p-2 border rounded"
              value={measuredParameter}
              onChange={(e) => setMeasuredParameter(e.target.value as keyof CellStateCreate['parameters'])}
              disabled={!formData.parent_id} // Disable if no parent selected
            >
              {measurableParameters.map(param => (
                <option key={param} value={param}>
                  {param} (Current: {parentParameters[param] ?? 'N/A'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New Measured Value
            </label>
            <input
              // Determine input type based on selected parameter's type in parent
              type={typeof parentParameters[measuredParameter] === 'number' ? 'number' : 'text'}
              className="mt-1 w-full p-2 border rounded"
              value={measuredValue}
              onChange={(e) => setMeasuredValue(e.target.value)}
              placeholder={`Enter new value for ${measuredParameter}`}
              required // Value is required for measurement
              disabled={!formData.parent_id} // Disable if no parent selected
            />
          </div>
        </div>
      )}


      {/* Split Transition Form - Conditionally Rendered */}
      {transitionType === 'split' && splitStates.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-800">Split State Details</h4>
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
      )}

      {/* Single Transition/Measurement Form Fields (excluding split/measurement specific) */}
      {/* These fields are needed for 'single' and provide defaults for 'measurement' */}
      {transitionType !== 'split' && (
         <div className="space-y-4 pt-4 border-t">
           <h4 className="font-medium text-gray-800">
             {transitionType === 'single' ? 'New State Details' : 'Base Details (Before Measurement)'}
            </h4>
            {/* We only need the name field here now, as others are inherited or measured */}
             <div>
              <label className="block text-sm font-medium text-gray-700">
                State Name (Required)
              </label>
              <input
                type="text"
                className="mt-1 w-full p-2 border rounded"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter a name (e.g., Measured Temp, Passage 5)"
                required
              />
            </div>

           {/* Keep existing single form fields if needed for 'single' type, but hide for 'measurement' */}
           {transitionType === 'single' && (
             <>
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <input type="text" className="mt-1 w-full p-2 border rounded" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} />
              </div>
              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Temperature (°C)</label>
                <input type="number" step="0.1" className="mt-1 w-full p-2 border rounded" value={formData.temperature_c} onChange={(e) => setFormData({ ...formData, temperature_c: parseFloat(e.target.value) })} />
              </div>
              {/* Volume */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Volume (ml)</label>
                <input type="number" step="0.1" className="mt-1 w-full p-2 border rounded" value={formData.volume_ml} onChange={(e) => setFormData({ ...formData, volume_ml: parseFloat(e.target.value) })} />
              </div>
              {/* Location */}
               <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                 <input type="text" className="mt-1 w-full p-2 border rounded" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
               </div>
               {/* Cell Density */}
               <div>
                 <label className="block text-sm font-medium text-gray-700">Cell Density (cells/ml)</label>
                 <input type="number" className="mt-1 w-full p-2 border rounded" value={formData.cell_density} onChange={(e) => setFormData({ ...formData, cell_density: parseFloat(e.target.value) })} />
               </div>
               {/* Viability */}
               <div>
                 <label className="block text-sm font-medium text-gray-700">Viability (%)</label>
                 <input type="number" min="0" max="100" className="mt-1 w-full p-2 border rounded" value={formData.viability} onChange={(e) => setFormData({ ...formData, viability: parseFloat(e.target.value) })} />
               </div>
               {/* Storage Location (Optional) */}
               <div>
                 <label className="block text-sm font-medium text-gray-700">Storage Location (Optional)</label>
                 <input type="text" className="mt-1 w-full p-2 border rounded" value={formData.storage_location} onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })} placeholder="e.g., Freezer A, Shelf 3" />
               </div>
             </>
           )}

         </div>
      )}

      {/* Submit/Cancel Buttons */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
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