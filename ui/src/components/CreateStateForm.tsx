import { useState, useCallback, useEffect } from 'react'
import { CellState, CellStateCreate } from '../api'

interface CreateStateFormProps {
  onSubmit: (data: Array<{
    name: string;
    timestamp: string;
    parent_id?: number;
    parameters: CellStateCreate['parameters'];
    transition_type?: 'single' | 'split' | 'measurement';
    transition_parameters?: Record<string, any>;
    additional_notes?: string;
  }>) => void;
  onCancel: () => void;
  existingStates: CellState[];
}

// Define parameter keys for measurement dropdown
const measurableParameters: Array<keyof CellStateCreate['parameters']> = [
  'temperature_c',
  'volume_ml',
  'location',
  'cell_density',
  'viability',
  'growth_rate',
  'density_limit',
  // 'split_ratio' and 'storage_location' might not make sense to "measure"
  // but can be included if needed.
];

// Define operation types that map to transition types
type OperationType = 'start_new_culture' | 'passage' | 'freeze' | 'thaw' | 'measurement' | 'split' | 'harvest';

// Map operation types to transition types
const operationToTransitionType: Record<OperationType, 'single' | 'split' | 'measurement'> = {
  start_new_culture: 'single',
  passage: 'single',
  freeze: 'single',
  thaw: 'single',
  measurement: 'measurement',
  split: 'split',
  harvest: 'single'
};

export default function CreateStateForm({ onSubmit, onCancel, existingStates }: CreateStateFormProps) {
  const states = existingStates;

  // Add state for the selected operation type (domain-specific terminology)
  const [operationType, setOperationType] = useState<OperationType>('passage');
  
  // Add state for the underlying transition type (technical implementation)
  const [transitionType, setTransitionType] = useState<'single' | 'split' | 'measurement'>('single');

  // Get current datetime in local timezone for default input value
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); // Adjust for local timezone
  const defaultDateTimeLocal = now.toISOString().slice(0, 16); // Format YYYY-MM-DDTHH:mm

  const [manualTimestamp, setManualTimestamp] = useState<string>(defaultDateTimeLocal);

  // Define formData state without using parentParameters in initialization
  const [formData, setFormData] = useState({
    name: "", // Default: empty, placeholder will guide
    parent_id: undefined as number | undefined,
    temperature_c: -80, // Default: -80 (freezer temperature)
    volume_ml: 10, // Default: 10
    location: 'Incubator 1', // Default: Incubator 1
    cell_density: 1e5, // Default: 100,000
    viability: 100, // Default: 100%
    storage_location: '', // Default: empty
    growth_rate: Math.log(2) / 1, // Default: Calculated from 1h doubling time
    doubling_time: 1, // Default: 1 hour
    density_limit: 1e6, // Default: 1,000,000
    additional_notes: '', // Default: empty
    cell_type: '', // New field for cell type
    parent_end_density: 0, // New field for parent end density with default value
    number_of_vials: 1, // New field for number of frozen vials
    total_cells: 0, // New field for total cells per vial
    number_of_passages: 1, // New field for number of new passages in thaw
    end_density: 0, // New field for end cell density at harvest
  });

  // Get the parent state's parameters - ensure it updates when parent_id changes
  const parentState = states.find(s => s.id === formData.parent_id);
  // Provide default empty object if no parent or parent has no parameters
  const parentParameters = parentState?.parameters || {};
  
  // Update parent_end_density when parent changes
  useEffect(() => {
    if (parentState && parentParameters.cell_density) {
      if (operationType === 'passage') {
        setFormData(prev => ({
          ...prev,
          parent_end_density: parentParameters.cell_density as number
        }));
      } else if (operationType === 'harvest') {
        setFormData(prev => ({
          ...prev,
          end_density: parentParameters.cell_density as number
        }));
      }
    }
  }, [parentState, operationType, parentParameters.cell_density]);

  // Default parameters for different operation types - MOVED HERE after formData is defined
  const operationDefaults: Record<OperationType, Partial<typeof formData>> = {
    start_new_culture: {
      temperature_c: 37,
      volume_ml: 10,
      location: 'Incubator 1',
      cell_density: 1e5,
      viability: 100,
    },
    passage: {
      temperature_c: 37,
      volume_ml: 10,
      location: 'Incubator 1',
      cell_density: 5e4,
      viability: 95,
    },
    freeze: {
      temperature_c: -80,
      volume_ml: 1,
      location: 'Freezer',
      cell_density: 1e6,
      viability: 90,
      storage_location: 'Box 1, Position A1',
    },
    thaw: {
      temperature_c: 37,
      volume_ml: 10,
      location: 'Incubator 1',
      cell_density: 3e5,
      viability: 85,
    },
    harvest: {
      temperature_c: 37,
      volume_ml: 10,
      location: 'Incubator 1',
      end_density: 0, // Will be updated from parent's cell density once selected
      name: 'Final Harvest', // Default name for harvest operation
      viability: 90,
    },
    measurement: {}, // Measurement uses parent values
    split: {}        // Split has its own custom UI
  };

  // State for measurement transition
  const [measuredParameter, setMeasuredParameter] = useState<keyof CellStateCreate['parameters']>(measurableParameters[0]);
  const [measuredValue, setMeasuredValue] = useState<string | number>('');


  const [splitStates, setSplitStates] = useState<Array<{
    name: string;
    temperature_c: number;
    volume_ml: number;
    location: string;
    cell_density: number;
    viability: number;
    storage_location: string;
    growth_rate: number;
    density_limit: number;
    distribution: number;
    operation_type: OperationType;
  }>>([])

  // --- Calculation Logic --- 
  const calculateLinkedParameter = useCallback((changedParam: 'growth_rate' | 'doubling_time', value: number) => {
    if (changedParam === 'growth_rate') {
      if (value > 0) {
        return Math.log(2) / value;
      } else {
        return 0; // Or handle as infinity/undefined if preferred
      }
    } else { // changedParam === 'doubling_time'
      if (value > 0) {
        return Math.log(2) / value;
      } else {
        return 0; // Or handle differently
      }
    }
  }, []);

  const handleParameterChange = (param: keyof typeof formData, value: string | number) => {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numericValue)) {
      // Handle non-numeric input gracefully (e.g., keep the state as is, or set to 0/empty string)
      // For simplicity, let's just update with the raw value for now, validation can handle it
      setFormData(prev => ({ ...prev, [param]: value })); 
      return; 
    }

    let updates: Partial<typeof formData> = { [param]: numericValue };

    if (param === 'growth_rate') {
      const linkedDoublingTime = calculateLinkedParameter('growth_rate', numericValue);
      updates['doubling_time'] = linkedDoublingTime;
    } else if (param === 'doubling_time') {
      const linkedGrowthRate = calculateLinkedParameter('doubling_time', numericValue);
      updates['growth_rate'] = linkedGrowthRate;
    }

    setFormData(prev => ({ ...prev, ...updates }));
  };
  // --- End Calculation Logic ---

  // Function to apply defaults based on operation type
  const applyOperationDefaults = (operation: OperationType) => {
    const defaults = operationDefaults[operation];
    setFormData(prev => ({
      ...prev,
      ...defaults
    }));
  };

  // Function to handle operation type change
  const handleOperationTypeChange = (newOperation: OperationType) => {
    setOperationType(newOperation);
    
    // Set the corresponding transition type
    const newTransitionType = operationToTransitionType[newOperation];
    setTransitionType(newTransitionType);
    
    // Apply default values for this operation
    applyOperationDefaults(newOperation);
    
    // For start_new_culture, always set parent_id to undefined (new cell line)
    if (newOperation === 'start_new_culture') {
      setFormData(prev => ({
        ...prev,
        parent_id: undefined
      }));
    }
    
    // For freeze, ensure storage temperature is set correctly
    if (newOperation === 'freeze') {
      setFormData(prev => ({
        ...prev,
        temperature_c: -80
      }));
    }
    
    // For thaw, reset temperature to 37°C (incubator)
    if (newOperation === 'thaw') {
      setFormData(prev => ({
        ...prev,
        temperature_c: 37,
        location: 'Incubator 1'
      }));
    }
    
    // For harvest, update end_density if parent is already selected
    if (newOperation === 'harvest' && parentState?.parameters?.cell_density) {
      setFormData(prev => ({
        ...prev,
        end_density: parentState.parameters.cell_density as number
      }));
    }
    
    // Additional setup based on transition type
    if (newTransitionType === 'split') {
      // Add initial state if switching to split and none exist
      if (splitStates.length === 0) {
        addSplitState();
      }
    } else {
      // Clear split states if switching away from split
      setSplitStates([]);
    }
    
    // Reset measurement fields if not measurement type
    if (newTransitionType !== 'measurement') {
      setMeasuredParameter(measurableParameters[0]);
      setMeasuredValue('');
    }
    
    // Reset optional parameters visibility when changing operation type
    setShowOptionalParams(false);
  };

  // Function to validate if a parent state can be selected - simplify to check state name
  const canSelectParent = (state: CellState) => {
    const nameContainsHarvest = state.name?.toLowerCase().includes('harvest') || false;
    
    // Return false if state name contains harvest (cannot be a parent)
    return !nameContainsHarvest;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Add simple validation for parent state based on name
    if (formData.parent_id) {
      const selectedParent = states.find(s => s.id === formData.parent_id);
      
      // Check if parent state name contains "Harvest"
      if (selectedParent?.name?.toLowerCase().includes('harvest')) {
        alert('Cannot create a child state from a harvested culture. Please select a different parent state.');
        return;
      }
    }

    // Validate parent selection for passage operation
    if (operationType === 'passage' && !formData.parent_id) {
      alert('A parent state must be selected for passage operations.');
      return;
    }
    
    // Validate parent selection for freeze operation
    if (operationType === 'freeze' && !formData.parent_id) {
      alert('A parent state must be selected for freeze operations.');
      return;
    }
    
    // Validate parent selection for thaw operation
    if (operationType === 'thaw' && !formData.parent_id) {
      alert('A frozen vial must be selected for thaw operations.');
      return;
    }
    
    // Validate parent selection for harvest operation
    if (operationType === 'harvest' && !formData.parent_id) {
      alert('A parent state must be selected for harvest operations.');
      return;
    }

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

    // Create a descriptive note based on operation type if none provided
    let notes = formData.additional_notes;
    if (!notes) {
      const operationDescriptions: Record<OperationType, string> = {
        start_new_culture: 'Started new culture',
        passage: 'Passaged cells',
        freeze: 'Cells frozen for storage',
        thaw: 'Thawed cells from frozen stock',
        measurement: 'Measured parameter',
        split: 'Split culture into multiple containers',
        harvest: 'Harvested culture'
      };
      notes = operationDescriptions[operationType];
    }

    // For harvest operations, set default name if empty
    const finalName = operationType === 'harvest' && !formData.name 
      ? `Harvest of ${parentState?.name || 'Unknown'}`
      : formData.name;

    // Always set the operation_type for new states to track properly going forward
    const basePayload = {
      name: finalName,
      timestamp: newTimestamp.toISOString(), // Use validated manual timestamp
      parent_id: formData.parent_id,
      additional_notes: notes,
      // Store operation type so future filtering will work properly
      transition_parameters: { 
        operation_type: operationType,
        ...(operationType === 'start_new_culture' ? { cell_type: formData.cell_type } : {}),
        ...(operationType === 'passage' ? { 
          parent_end_density: formData.parent_end_density,
          cell_type: parentState?.transition_parameters?.cell_type || ''
        } : {}),
        ...(operationType === 'freeze' ? {
          parent_end_density: formData.parent_end_density,
          number_of_vials: formData.number_of_vials,
          total_cells: formData.total_cells,
          cell_type: parentState?.transition_parameters?.cell_type || ''
        } : {}),
        ...(operationType === 'thaw' ? {
          number_of_passages: formData.number_of_passages,
          cell_type: parentState?.transition_parameters?.cell_type || ''
        } : {}),
        ...(operationType === 'harvest' ? {
          end_density: formData.end_density,
          cell_type: parentState?.transition_parameters?.cell_type || ''
        } : {})
      }
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
      const statesToSubmit = splitStates.map(state => {
        // Get the corresponding transition type for this split's operation
        const splitTransitionType = operationToTransitionType[state.operation_type];
        // Get automatic notes based on operation type if none provided
        let stateNotes = formData.additional_notes;
        if (!stateNotes) {
          const operationDescriptions: Record<OperationType, string> = {
            start_new_culture: 'Started new culture',
            passage: 'Passaged cells',
            freeze: 'Cells frozen for storage',
            thaw: 'Thawed cells from frozen stock',
            measurement: 'Measured parameter',
            split: 'Split culture into multiple containers',
            harvest: 'Harvested culture'
          };
          stateNotes = operationDescriptions[state.operation_type];
        }
        
        return {
          ...basePayload, // Use base payload
          name: state.name, // Override name
          parameters: { // Use split state parameters
            temperature_c: state.temperature_c,
            volume_ml: state.volume_ml,
            location: state.location,
            cell_density: state.cell_density,
            viability: state.viability,
            storage_location: state.storage_location,
            growth_rate: state.growth_rate,
            density_limit: state.density_limit,
          },
          transition_type: splitTransitionType, // Use the appropriate transition type
          transition_parameters: { operation_type: state.operation_type }, // Store operation type 
          additional_notes: stateNotes,
        };
      });
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
        additional_notes: formData.additional_notes,
      }]);

    } else { // Single transition
      onSubmit([{
        ...basePayload,
        parameters: {
          temperature_c: formData.temperature_c,
          volume_ml: formData.volume_ml,
          location: formData.location,
          cell_density: formData.cell_density,
          viability: formData.viability,
          storage_location: formData.storage_location,
          growth_rate: formData.growth_rate,
          doubling_time: formData.doubling_time,
          density_limit: formData.density_limit,
        } as CellStateCreate['parameters'], // Explicitly type the parameters object
        transition_type: 'single',
        additional_notes: formData.additional_notes,
      }]);
    }
  }

  const addSplitState = () => {
    setSplitStates([...splitStates, {
      name: "",
      temperature_c: 37,
      volume_ml: 20,
      location: 'incubator',
      cell_density: 0,
      viability: 100,
      storage_location: '',
      growth_rate: 0,
      density_limit: 0,
      distribution: 0,
      operation_type: 'passage',
    }])
  }

  const removeSplitState = (index: number) => {
    setSplitStates(splitStates.filter((_, i) => i !== index))
  }

  const updateSplitState = (index: number, field: string, value: any) => {
    const newSplitStates = [...splitStates]
    newSplitStates[index] = { ...newSplitStates[index], [field]: value }
    
    // If operation type is changed, apply the defaults for that operation
    if (field === 'operation_type' && typeof value === 'string') {
      const operationType = value as OperationType;
      const defaults = operationDefaults[operationType];
      
      // Apply defaults while keeping existing values for fields that are not in defaults
      // and preserving name and distribution
      newSplitStates[index] = { 
        ...newSplitStates[index], 
        ...defaults,
        name: newSplitStates[index].name, 
        distribution: newSplitStates[index].distribution 
      };
    }
    
    setSplitStates(newSplitStates)
  }

  // State to track whether optional parameters are shown
  const [showOptionalParams, setShowOptionalParams] = useState<boolean>(false);

  // Render operation-specific fields based on operation type
  const renderOperationSpecificFields = () => {
    if (transitionType !== 'single') return null;

    if (operationType === 'start_new_culture') {
      return (
        <>
          {/* Key parameters for Start New Culture */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-gray-800">New Culture Details</h4>
            
            {/* Cell Type - Now a separate field from Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Cell Type</label>
              <input 
                type="text" 
                className="mt-1 w-full p-2 border rounded"
                value={formData.cell_type || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, cell_type: e.target.value }))}
                placeholder="e.g., HEK293, CHO-K1, etc."
                required
              />
              <p className="mt-1 text-xs text-gray-500">The type of cells being cultured</p>
            </div>
            
            {/* Initial Cell Density */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Initial Cell Density (cells/ml)</label>
              <input 
                type="number" 
                min="0" 
                step="1000"
                className="mt-1 w-full p-2 border rounded"
                value={formData.cell_density} 
                onChange={(e) => setFormData({ ...formData, cell_density: Number(e.target.value) })}
                required
              />
            </div>
            
            {/* Show/Hide Optional Parameters */}
            <div className="pt-3">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                onClick={() => setShowOptionalParams(!showOptionalParams)}
              >
                {showOptionalParams ? '↑ Hide' : '↓ Show'} Optional Parameters
              </button>
            </div>
            
            {/* Optional Parameters Section */}
            {showOptionalParams && (
              <div className="space-y-3 pl-2 border-l-2 border-gray-200">
                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Temperature (°C)</label>
                  <input 
                    type="number" 
                    value={formData.temperature_c} 
                    onChange={(e) => setFormData({ ...formData, temperature_c: Number(e.target.value) })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Volume */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Volume (ml)</label>
                  <input 
                    type="number" 
                    value={formData.volume_ml} 
                    onChange={(e) => setFormData({ ...formData, volume_ml: Number(e.target.value) })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input 
                    type="text" 
                    value={formData.location} 
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Viability */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Viability (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={formData.viability} 
                    onChange={(e) => setFormData({ ...formData, viability: Number(e.target.value) })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Growth Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Growth Rate (per hour)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.growth_rate}
                    onChange={(e) => handleParameterChange('growth_rate', e.target.value)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 0.03 (per hour)"
                  />
                </div>
                
                {/* Doubling Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Doubling Time (hours)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.doubling_time}
                    onChange={(e) => handleParameterChange('doubling_time', e.target.value)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 23.1 (hours)"
                  />
                  <p className="mt-1 text-xs text-gray-500">Calculated automatically if Growth Rate is entered, and vice-versa.</p>
                </div>
                
                {/* Density Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Density Limit (cells/mL)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.density_limit}
                    onChange={(e) => handleParameterChange('density_limit', e.target.value)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 1.5e6 (cells/ml)"
                  />
                </div>
                
                {/* Storage Location (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Storage Location (Optional)</label>
                  <input 
                    type="text" 
                    value={formData.storage_location} 
                    onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
              </div>
            )}
          </div>
        </>
      );
    } else if (operationType === 'passage') {
      // Check if parent exists
      const hasParent = !!parentState;
      const parentCellType = hasParent ? parentState.transition_parameters?.cell_type || '' : '';
      
      return (
        <>
          {/* Key parameters for Passage */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-gray-800">Passage Details</h4>
            
            {!hasParent && (
              <p className="text-sm text-red-600 font-medium">
                Parent state selection is required for passage operations.
              </p>
            )}
            
            {/* Parent Information */}
            {hasParent && (
              <>
                <div className="bg-gray-50 p-3 rounded border mb-4">
                  <h5 className="text-sm font-semibold mb-2">Parent Information</h5>
                  <div className="text-sm">
                    <p><span className="font-medium">Name:</span> {parentState.name}</p>
                    {parentState.transition_parameters?.cell_type && (
                      <p><span className="font-medium">Cell Type:</span> {parentState.transition_parameters.cell_type}</p>
                    )}
                    <p><span className="font-medium">Current Density:</span> {parentParameters.cell_density?.toLocaleString() || 'N/A'} cells/ml</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 italic mb-4">
                  The cell type will be automatically inherited from the parent state.
                </p>
              </>
            )}
            
            {/* Parent End Cell Density */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Parent End Cell Density (cells/ml)</label>
              <input 
                type="number" 
                min="0" 
                step="1000"
                className="mt-1 w-full p-2 border rounded"
                value={formData.parent_end_density} 
                onChange={(e) => setFormData(prev => ({ ...prev, parent_end_density: Number(e.target.value) }))}
                required
                disabled={!hasParent}
              />
              <p className="mt-1 text-xs text-gray-500">Cell density at the time of passage</p>
            </div>
            
            {/* New Passage Start Cell Density */}
            <div>
              <label className="block text-sm font-medium text-gray-700">New Passage Start Cell Density (cells/ml)</label>
              <input 
                type="number" 
                min="0" 
                step="1000"
                className="mt-1 w-full p-2 border rounded"
                value={formData.cell_density} 
                onChange={(e) => setFormData({ ...formData, cell_density: Number(e.target.value) })}
                required
              />
            </div>
            
            {/* Show/Hide Optional Parameters */}
            <div className="pt-3">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                onClick={() => setShowOptionalParams(!showOptionalParams)}
                disabled={!hasParent}
              >
                {showOptionalParams ? '↑ Hide' : '↓ Show'} Optional Parameters
              </button>
            </div>
            
            {/* Optional Parameters Section */}
            {showOptionalParams && hasParent && (
              <div className="space-y-3 pl-2 border-l-2 border-gray-200">
                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Temperature (°C)</label>
                  <input 
                    type="number" 
                    value={formData.temperature_c} 
                    onChange={(e) => setFormData({ ...formData, temperature_c: Number(e.target.value) })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Volume */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Volume (ml)</label>
                  <input 
                    type="number" 
                    value={formData.volume_ml} 
                    onChange={(e) => setFormData({ ...formData, volume_ml: Number(e.target.value) })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input 
                    type="text" 
                    value={formData.location} 
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Viability */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Viability (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={formData.viability} 
                    onChange={(e) => setFormData({ ...formData, viability: Number(e.target.value) })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Growth Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Growth Rate (per hour)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.growth_rate}
                    onChange={(e) => handleParameterChange('growth_rate', e.target.value)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 0.03 (per hour)"
                  />
                </div>
                
                {/* Doubling Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Doubling Time (hours)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.doubling_time}
                    onChange={(e) => handleParameterChange('doubling_time', e.target.value)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 23.1 (hours)"
                  />
                  <p className="mt-1 text-xs text-gray-500">Calculated automatically if Growth Rate is entered, and vice-versa.</p>
                </div>
                
                {/* Density Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Density Limit (cells/mL)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.density_limit}
                    onChange={(e) => handleParameterChange('density_limit', e.target.value)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 1.5e6 (cells/ml)"
                  />
                </div>
                
                {/* Storage Location (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Storage Location (Optional)</label>
                  <input 
                    type="text" 
                    value={formData.storage_location} 
                    onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
              </div>
            )}
          </div>
        </>
      );
    } else if (operationType === 'freeze') {
      // Check if parent exists
      const hasParent = !!parentState;
      
      return (
        <>
          {/* Key parameters for Freeze */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-gray-800">Freeze Details</h4>
            
            {!hasParent && (
              <p className="text-sm text-red-600 font-medium">
                Parent state selection is required for freeze operations.
              </p>
            )}
            
            {/* Parent Information */}
            {hasParent && (
              <>
                <div className="bg-gray-50 p-3 rounded border mb-4">
                  <h5 className="text-sm font-semibold mb-2">Parent Information</h5>
                  <div className="text-sm">
                    <p><span className="font-medium">Name:</span> {parentState.name}</p>
                    {parentState.transition_parameters?.cell_type && (
                      <p><span className="font-medium">Cell Type:</span> {parentState.transition_parameters.cell_type}</p>
                    )}
                    <p><span className="font-medium">Current Density:</span> {parentParameters.cell_density?.toLocaleString() || 'N/A'} cells/ml</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 italic mb-4">
                  The cell type will be automatically inherited from the parent state.
                </p>
              </>
            )}
            
            {/* Number of Frozen Vials */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Number of Frozen Vials</label>
              <input 
                type="number" 
                min="1" 
                step="1"
                className="mt-1 w-full p-2 border rounded"
                value={formData.number_of_vials} 
                onChange={(e) => setFormData(prev => ({ ...prev, number_of_vials: Number(e.target.value) }))}
                required
              />
            </div>
            
            {/* Parent End Cell Density */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Parent End Cell Density (cells/ml)</label>
              <input 
                type="number" 
                min="0" 
                step="1000"
                className="mt-1 w-full p-2 border rounded"
                value={formData.parent_end_density} 
                onChange={(e) => setFormData(prev => ({ ...prev, parent_end_density: Number(e.target.value) }))}
                required
                disabled={!hasParent}
              />
              <p className="mt-1 text-xs text-gray-500">Cell density at the time of freezing</p>
            </div>
            
            {/* Frozen Vial Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Frozen Vial Name</label>
              <input 
                type="text"
                className="mt-1 w-full p-2 border rounded"
                value={formData.name} 
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., HEK293 P5 Freezedown"
                required
              />
            </div>
            
            {/* Frozen Vial Total Cells */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Cells per Vial</label>
              <input 
                type="number" 
                min="0" 
                step="1000000"
                className="mt-1 w-full p-2 border rounded"
                value={formData.total_cells} 
                onChange={(e) => setFormData(prev => ({ ...prev, total_cells: Number(e.target.value) }))}
                required
              />
              <p className="mt-1 text-xs text-gray-500">Total number of cells in each vial</p>
            </div>
            
            {/* Frozen Vial Total Volume */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Vial Volume (ml)</label>
              <input 
                type="number" 
                min="0" 
                step="0.1"
                className="mt-1 w-full p-2 border rounded"
                value={formData.volume_ml} 
                onChange={(e) => setFormData(prev => ({ ...prev, volume_ml: Number(e.target.value) }))}
                required
              />
              <p className="mt-1 text-xs text-gray-500">Total volume of each vial</p>
            </div>
            
            {/* Storage Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Storage Temperature (°C)</label>
              <input 
                type="number" 
                className="mt-1 w-full p-2 border rounded"
                value={formData.temperature_c} 
                onChange={(e) => setFormData(prev => ({ ...prev, temperature_c: Number(e.target.value) }))}
                required
              />
              <p className="mt-1 text-xs text-gray-500">Typical values: -80°C (freezer) or -196°C (liquid nitrogen)</p>
            </div>
            
            {/* Storage Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Storage Location</label>
              <input 
                type="text" 
                className="mt-1 w-full p-2 border rounded"
                value={formData.storage_location} 
                onChange={(e) => setFormData(prev => ({ ...prev, storage_location: e.target.value }))}
                placeholder="e.g., Freezer 2, Box A, Position A1"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Specific storage location of vials</p>
            </div>
            
            {/* Show/Hide Optional Parameters */}
            <div className="pt-3">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                onClick={() => setShowOptionalParams(!showOptionalParams)}
              >
                {showOptionalParams ? '↑ Hide' : '↓ Show'} Optional Parameters
              </button>
            </div>
            
            {/* Optional Parameters Section */}
            {showOptionalParams && (
              <div className="space-y-3 pl-2 border-l-2 border-gray-200">
                {/* Viability */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Viability (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={formData.viability} 
                    onChange={(e) => setFormData({ ...formData, viability: Number(e.target.value) })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Growth Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Growth Rate (per hour)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.growth_rate}
                    onChange={(e) => handleParameterChange('growth_rate', e.target.value)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 0.03 (per hour)"
                  />
                </div>
                
                {/* Doubling Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Doubling Time (hours)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.doubling_time}
                    onChange={(e) => handleParameterChange('doubling_time', e.target.value)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 23.1 (hours)"
                  />
                  <p className="mt-1 text-xs text-gray-500">Calculated automatically if Growth Rate is entered, and vice-versa.</p>
                </div>
                
                {/* Density Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Density Limit (cells/mL)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.density_limit}
                    onChange={(e) => handleParameterChange('density_limit', e.target.value)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 1.5e6 (cells/ml)"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      );
    } else if (operationType === 'thaw') {
      // Check if parent (frozen vial) exists
      const hasParent = !!parentState;
      const isFrozenVial = hasParent && parentState.transition_parameters?.operation_type === 'freeze';
      const parentCellType = hasParent ? parentState.transition_parameters?.cell_type || '' : '';
      
      return (
        <>
          {/* Key parameters for Thaw */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-gray-800">Thaw Details</h4>
            
            {!hasParent && (
              <p className="text-sm text-red-600 font-medium">
                A frozen vial must be selected for thaw operations.
              </p>
            )}
            
            {hasParent && !isFrozenVial && (
              <p className="text-sm text-amber-600 font-medium">
                Warning: Selected parent is not a frozen vial. Ideally, select a state with "Freeze" operation type.
              </p>
            )}
            
            {/* Parent (Frozen Vial) Information */}
            {hasParent && (
              <>
                <div className="bg-gray-50 p-3 rounded border mb-4">
                  <h5 className="text-sm font-semibold mb-2">Frozen Vial Information</h5>
                  <div className="text-sm">
                    <p><span className="font-medium">Vial Name:</span> {parentState.name}</p>
                    {parentState.transition_parameters?.cell_type && (
                      <p><span className="font-medium">Cell Type:</span> {parentState.transition_parameters.cell_type}</p>
                    )}
                    {parentState.transition_parameters?.total_cells && (
                      <p><span className="font-medium">Total Cells:</span> {Number(parentState.transition_parameters.total_cells).toLocaleString()} cells</p>
                    )}
                    {parentState.parameters?.storage_location && (
                      <p><span className="font-medium">Storage Location:</span> {parentState.parameters.storage_location}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 italic mb-4">
                  The cell type will be automatically inherited from the frozen vial.
                </p>
              </>
            )}
            
            {/* Number of New Passages */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Number of New Passages</label>
              <input 
                type="number" 
                min="1" 
                step="1"
                className="mt-1 w-full p-2 border rounded"
                value={formData.number_of_passages} 
                onChange={(e) => setFormData(prev => ({ ...prev, number_of_passages: Number(e.target.value) }))}
                required
              />
              <p className="mt-1 text-xs text-gray-500">How many new cultures are being started from this vial</p>
            </div>
            
            {/* New Passage Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">New Passage Name</label>
              <input 
                type="text"
                className="mt-1 w-full p-2 border rounded"
                value={formData.name} 
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., HEK293 P6 Thawed"
                required
              />
            </div>
            
            {/* New Passage Start Cell Density */}
            <div>
              <label className="block text-sm font-medium text-gray-700">New Passage Start Cell Density (cells/ml)</label>
              <input 
                type="number" 
                min="0" 
                step="1000"
                className="mt-1 w-full p-2 border rounded"
                value={formData.cell_density} 
                onChange={(e) => setFormData(prev => ({ ...prev, cell_density: Number(e.target.value) }))}
                required
              />
              <p className="mt-1 text-xs text-gray-500">Initial cell density after thawing</p>
            </div>
            
            {/* Show/Hide Optional Parameters */}
            <div className="pt-3">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                onClick={() => setShowOptionalParams(!showOptionalParams)}
              >
                {showOptionalParams ? '↑ Hide' : '↓ Show'} Optional Parameters
              </button>
            </div>
            
            {/* Optional Parameters Section */}
            {showOptionalParams && (
              <div className="space-y-3 pl-2 border-l-2 border-gray-200">
                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Temperature (°C)</label>
                  <input 
                    type="number" 
                    value={formData.temperature_c} 
                    onChange={(e) => setFormData({ ...formData, temperature_c: Number(e.target.value) })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Volume */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Volume (ml)</label>
                  <input 
                    type="number" 
                    value={formData.volume_ml} 
                    onChange={(e) => setFormData({ ...formData, volume_ml: Number(e.target.value) })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input 
                    type="text" 
                    value={formData.location} 
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Viability */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Viability (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={formData.viability} 
                    onChange={(e) => setFormData({ ...formData, viability: Number(e.target.value) })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Growth Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Growth Rate (per hour)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.growth_rate}
                    onChange={(e) => handleParameterChange('growth_rate', e.target.value)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 0.03 (per hour)"
                  />
                </div>
                
                {/* Doubling Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Doubling Time (hours)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.doubling_time}
                    onChange={(e) => handleParameterChange('doubling_time', e.target.value)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 23.1 (hours)"
                  />
                  <p className="mt-1 text-xs text-gray-500">Calculated automatically if Growth Rate is entered, and vice-versa.</p>
                </div>
                
                {/* Density Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Density Limit (cells/mL)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.density_limit}
                    onChange={(e) => handleParameterChange('density_limit', e.target.value)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 1.5e6 (cells/ml)"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      );
    } else if (operationType === 'harvest') {
      // Check if parent exists
      const hasParent = !!parentState;
      
      return (
        <>
          {/* Key parameters for Harvest */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-gray-800">Harvest Details</h4>
            
            {!hasParent && (
              <p className="text-sm text-red-600 font-medium">
                A parent state must be selected for harvest operations.
              </p>
            )}
            
            {/* Parent Information */}
            {hasParent && (
              <>
                <div className="bg-gray-50 p-3 rounded border mb-4">
                  <h5 className="text-sm font-semibold mb-2">Parent Information</h5>
                  <div className="text-sm">
                    <p><span className="font-medium">Name:</span> {parentState.name}</p>
                    {parentState.transition_parameters?.cell_type && (
                      <p><span className="font-medium">Cell Type:</span> {parentState.transition_parameters.cell_type}</p>
                    )}
                    <p><span className="font-medium">Current Density:</span> {parentParameters.cell_density?.toLocaleString() || 'N/A'} cells/ml</p>
                  </div>
                </div>
                <div className="bg-amber-50 p-3 rounded border mb-4">
                  <p className="text-amber-700 font-medium">
                    ⚠️ Harvest (throw away) is a terminal operation. No further operations can be performed on this culture after harvest.
                  </p>
                  <p className="text-amber-700 text-sm mt-1">
                    <strong>This will be enforced in the database</strong> - harvested states cannot be parents for any future operations.
                  </p>
                </div>
              </>
            )}
            
            {/* End Cell Density */}
            <div>
              <label className="block text-sm font-medium text-gray-700">End Cell Density (cells/ml)</label>
              <input 
                type="number" 
                min="0" 
                step="1000"
                className="mt-1 w-full p-2 border rounded"
                value={formData.end_density || parentParameters.cell_density || 0} 
                onChange={(e) => setFormData(prev => ({ ...prev, end_density: Number(e.target.value) }))}
                required
              />
              <p className="mt-1 text-xs text-gray-500">Final cell density at the time of harvest</p>
            </div>
            
            {/* Show/Hide Optional Parameters */}
            <div className="pt-3">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                onClick={() => setShowOptionalParams(!showOptionalParams)}
              >
                {showOptionalParams ? '↑ Hide' : '↓ Show'} Optional Parameters
              </button>
            </div>
            
            {/* Optional Parameters Section */}
            {showOptionalParams && (
              <div className="space-y-3 pl-2 border-l-2 border-gray-200">
                {/* Harvest Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Harvest Name</label>
                  <input 
                    type="text"
                    className="mt-1 w-full p-2 border rounded"
                    value={formData.name} 
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Final harvest and discard"
                  />
                  <p className="mt-1 text-xs text-gray-500">Optional name for this harvest record</p>
                </div>
                
                {/* Viability */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Viability (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={formData.viability} 
                    onChange={(e) => setFormData({ ...formData, viability: Number(e.target.value) })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input 
                    type="text" 
                    value={formData.location} 
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Volume */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Volume (ml)</label>
                  <input 
                    type="number" 
                    value={formData.volume_ml} 
                    onChange={(e) => setFormData({ ...formData, volume_ml: Number(e.target.value) })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
              </div>
            )}
          </div>
        </>
      );
    }

    // For other single operations, return the default form
    return (
      <>
        {/* Temperature */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Temperature (°C)</label>
          <input type="number" value={formData.temperature_c} onChange={(e) => setFormData({ ...formData, temperature_c: Number(e.target.value) })} className="mt-1 w-full p-2 border rounded" />
        </div>
        {/* Volume */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Volume (ml)</label>
          <input type="number" value={formData.volume_ml} onChange={(e) => setFormData({ ...formData, volume_ml: Number(e.target.value) })} className="mt-1 w-full p-2 border rounded" />
        </div>
        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="mt-1 w-full p-2 border rounded" />
        </div>
        {/* Growth Rate */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700">Growth Rate (per hour)</label>
          <input
            type="number"
            step="any"
            value={formData.growth_rate}
            onChange={(e) => handleParameterChange('growth_rate', e.target.value)}
            className="mt-1 w-full p-2 border rounded"
            placeholder="e.g., 0.03 (per hour)"
          />
        </div>
        {/* Doubling Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Doubling Time (optional)</label>
          <input
            type="number"
            step="any"
            value={formData.doubling_time}
            onChange={(e) => handleParameterChange('doubling_time', e.target.value)}
            className="mt-1 w-full p-2 border rounded"
            placeholder="e.g., 23.1 (hours)"
          />
          <p className="mt-1 text-xs text-gray-500">Calculated automatically if Growth Rate is entered, and vice-versa.</p>
        </div>
        {/* Density Limit */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Density Limit (cells/mL)</label>
          <input
            type="number"
            step="any"
            value={formData.density_limit}
            onChange={(e) => handleParameterChange('density_limit', e.target.value)}
            className="mt-1 w-full p-2 border rounded"
            placeholder="e.g., 1.5e6 (cells/ml)"
          />
        </div>
        {/* Cell Density */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Cell Density</label>
          <input type="number" value={formData.cell_density} onChange={(e) => setFormData({ ...formData, cell_density: Number(e.target.value) })} className="mt-1 w-full p-2 border rounded" />
        </div>
        {/* Viability */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Viability (%)</label>
          <input type="number" min="0" max="100" value={formData.viability} onChange={(e) => setFormData({ ...formData, viability: Number(e.target.value) })} className="mt-1 w-full p-2 border rounded" />
        </div>
        {/* Storage Location (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Storage Location (Optional)</label>
          <input type="text" value={formData.storage_location} onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })} className="mt-1 w-full p-2 border rounded" />
        </div>
      </>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg">
      <h3 className="text-lg font-semibold">Create New State</h3>
      
      {/* Harvest Warning - Check name instead of operation_type */}
      {formData.parent_id && states.find(s => 
        s.id === formData.parent_id && 
        s.name?.toLowerCase().includes('harvest')
      ) && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          <p className="font-bold">⚠️ Invalid Parent Selection</p>
          <p>You have selected a harvested culture as parent. Harvested states cannot be used as parents.</p>
        </div>
      )}
      
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
          required={operationType !== 'harvest'} // Not required for harvest
        />
        {operationType === 'harvest' && (
          <p className="mt-1 text-xs text-red-500">
            Include "Harvest" in the name to prevent this culture from being used as a parent.
          </p>
        )}
      </div>

      {/* Parent State Selection - Hidden for Start New Culture */}
      {operationType !== 'start_new_culture' && (
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
            {/* Filter based on name instead of operation_type */}
            {states
              .filter(state => !state.name?.toLowerCase().includes('harvest'))
              .map((state) => (
                <option key={state.id} value={state.id}>
                  State {state.id} ({state.name || 'Unnamed'})
                  {state.name?.toLowerCase().includes('harvest') ? ' - HARVEST' : ''}
                </option>
              ))}
          </select>
          {operationType === 'harvest' && (
            <p className="mt-1 text-xs text-red-500">
              Select the culture that you are harvesting and discarding.
            </p>
          )}
        </div>
      )}

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

      {/* Operation Type Selection - REPLACED TRANSITION TYPE */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Operation Type
        </label>
        <select
          className="mt-1 w-full p-2 border rounded"
          value={operationType}
          onChange={(e) => handleOperationTypeChange(e.target.value as OperationType)}
        >
          <option value="start_new_culture">Start New Culture</option>
          <option value="passage">Passage</option>
          <option value="freeze">Freeze</option>
          <option value="thaw">Thaw from Existing Vial</option>
          <option value="harvest">Harvest (throw away)</option>
          <option value="measurement">Measurement</option>
          <option value="split">Split Culture</option>
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

              {/* Operation Type for this split */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Operation Type for This Portion
                </label>
                <select
                  className="mt-1 w-full p-2 border rounded"
                  value={state.operation_type}
                  onChange={(e) => updateSplitState(index, 'operation_type', e.target.value as OperationType)}
                >
                  <option value="passage">Passage (Continue Culture)</option>
                  <option value="freeze">Freeze (Store Sample)</option>
                  {/* Removed Start New Culture option as requested */}
                  {/* Skip thaw since it doesn't make sense for a split */}
                  {/* Skip measurement since it doesn't make sense for a split */}
                  {/* Skip split to avoid nested splits */}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select what will be done with this portion of the split culture.
                  Each split can have a different purpose.
                </p>
              </div>

              <div className="space-y-2">
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

      {/* Single Transition Form Fields (modified to use operation-specific rendering) */}
      {transitionType !== 'split' && (
         <div className="space-y-4 pt-4 border-t">
           <h4 className="font-medium text-gray-800">
             {transitionType === 'single' ? 'New State Details' : 'Base Details (Before Measurement)'}
           </h4>
           
           {/* Just keep name field here for measurement type */}
           {transitionType === 'measurement' && (
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
           )}
           
           {/* For single transitions, use operation-specific fields */}
           {transitionType === 'single' && renderOperationSpecificFields()}
         </div>
      )}

      {/* Additional Notes Textarea */}
      <div>
        <label htmlFor="additional_notes" className="block text-sm font-medium text-gray-700">
          Additional Notes
        </label>
        <textarea
          id="additional_notes"
          rows={3}
          className="mt-1 w-full p-2 border rounded"
          value={formData.additional_notes}
          onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
          placeholder="Enter any additional notes for this state..."
        />
      </div>

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