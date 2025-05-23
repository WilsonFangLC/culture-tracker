import { useState, useCallback, useEffect, useRef } from 'react'
import { CellState, CellStateCreate } from '../api'
import { calculateMeasuredDoublingTime } from '../utils/calculations'
import { useParameters } from './ParameterUtils'

interface CreateStateFormProps {
  onSubmit: (data: Array<{
    name: string;
    timestamp: string;
    parent_id?: number;
    parameters: CellStateCreate['parameters'];
    transition_type?: 'single' | 'split' | 'measurement';
    additional_notes?: string;
  }>) => void;
  onCancel: () => void;
  existingStates: CellState[];
  initialParentId?: number; // Add initialParentId prop
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

export default function CreateStateForm({ onSubmit, onCancel, existingStates, initialParentId }: CreateStateFormProps): JSX.Element {
  const states = existingStates;
  // Get parameter utilities
  const { getParameterDisplayName } = useParameters();

  // Add state for the selected operation type (domain-specific terminology)
  const [operationType, setOperationType] = useState<OperationType>('passage');
  
  // Add state for the underlying transition type (technical implementation)
  const [transitionType, setTransitionType] = useState<'single' | 'split' | 'measurement'>('single');

  // Get current datetime in local timezone for default input value
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); // Adjust for local timezone
  const defaultDateTimeLocal = now.toISOString().slice(0, 16); // Format YYYY-MM-DDTHH:mm

  const [manualTimestamp, setManualTimestamp] = useState<string>(defaultDateTimeLocal);

  // Define formData state with initialParentId if provided
  const [formData, setFormData] = useState<{
    name: string;
    parent_id: number | undefined;
    cell_density: number;
    timestamp: string;  // Add timestamp to the type definition
    temperature_c?: number;
    volume_ml?: number;
    location?: string;
    growth_rate?: number;
    doubling_time?: number;
    density_limit?: number;
    additional_notes?: string;
    cell_type?: string;
    parent_end_density?: number;
    number_of_vials?: number;
    total_cells?: number;
    number_of_passages?: number;
    end_density?: number;
    start_viability?: number;
    parent_end_viability?: number;
  }>({
    name: "", // Default: empty, placeholder will guide
    parent_id: initialParentId, // Use initialParentId if provided
    cell_density: 1e5, // Default: 100,000
    timestamp: new Date().toISOString().slice(0, 16), // Default to current date/time
    end_density: undefined, // Add end_density with default undefined
    
    // Optional parameters defaulting to undefined
    // All optional fields are left out of the initial state
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
      start_viability: undefined,
    },
    passage: {
      temperature_c: 37,
      volume_ml: 10,
      location: 'Incubator 1',
      cell_density: 5e4,
      start_viability: undefined,
      parent_end_viability: undefined,
    },
    freeze: {
      temperature_c: -80,
      volume_ml: 1,
      location: 'Freezer',
      cell_density: 1e6,
      parent_end_viability: undefined,
    },
    thaw: {
      temperature_c: 37,
      volume_ml: 10,
      location: 'Incubator 1',
      cell_density: 3e5,
      start_viability: undefined,
    },
    harvest: {
      temperature_c: 37,
      volume_ml: 10,
      location: 'Incubator 1',
      end_density: 0, // Will be updated from parent's cell density once selected
      name: 'Final Harvest', // Default name for harvest operation
      parent_end_viability: undefined,
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
    start_viability?: number; // Replace viability with start_viability
    parent_end_viability?: number; // Add parent_end_viability
    growth_rate: number;
    density_limit: number;
    operation_type: OperationType;
    showOptionalParams?: boolean;
    doubling_time?: number;
    number_of_vials?: number;
    total_cells?: number;
    storage_location?: string;
    viability?: number;
    end_density?: number; // Add end_density property
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
    // Allow empty values
    if (value === '') {
      setFormData(prev => ({ ...prev, [param]: undefined }));
      return;
    }

    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numericValue)) {
      // Handle non-numeric input gracefully
      setFormData(prev => ({ ...prev, [param]: value })); 
      return; 
    }

    let updates: Partial<typeof formData> = { [param]: numericValue };

    if (param === 'growth_rate' && numericValue > 0) {
      const linkedDoublingTime = calculateLinkedParameter('growth_rate', numericValue);
      updates['doubling_time'] = linkedDoublingTime;
    } else if (param === 'doubling_time' && numericValue > 0) {
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
        // For split, add two states by default to make it obvious it's a split
        addSplitState();
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
    e.preventDefault();
    
    // Validate required fields
    if (!formData.timestamp) {
      alert('Please select a date and time');
      return;
    }

    // If operation is harvest but parent is missing
    if (operationType === 'harvest' && !formData.parent_id) {
      alert('Harvest operation requires a parent state');
      return;
    }

    // If parent state doesn't exist anymore
    if (formData.parent_id && !states.find(s => s.id === formData.parent_id)) {
      alert('Selected parent state no longer exists');
      return;
    }

    // If measurement, validate measured parameter
    if (operationType === 'measurement' && (!measuredParameter || measuredValue === '')) {
      alert('Please select a parameter to measure and provide a value');
      return;
    }

    // Create base payload for the main state submission
    const statePayload = {
      name: formData.name,
      timestamp: formData.timestamp,
      parent_id: formData.parent_id || undefined,
      additional_notes: formData.additional_notes,
    };

    // Create parameters object, only including properties with defined values
    const parameters: Record<string, any> = {};
    
    // Only add parameters that have been set (not undefined)
    if (formData.temperature_c !== undefined) parameters.temperature_c = formData.temperature_c;
    if (formData.volume_ml !== undefined) parameters.volume_ml = formData.volume_ml;
    if (formData.location !== undefined) parameters.location = formData.location;
    if (formData.cell_density !== undefined) parameters.cell_density = formData.cell_density;
    if (formData.start_viability !== undefined) parameters.start_viability = formData.start_viability;
    if (formData.parent_end_viability !== undefined) parameters.parent_end_viability = formData.parent_end_viability;
    if (formData.growth_rate !== undefined) parameters.growth_rate = formData.growth_rate;
    if (formData.doubling_time !== undefined) parameters.doubling_time = formData.doubling_time;
    if (formData.density_limit !== undefined) parameters.density_limit = formData.density_limit;
    if (formData.cell_type !== undefined) parameters.cell_type = formData.cell_type;
    if (formData.end_density !== undefined) parameters.end_density = formData.end_density;
    
    // Special case for measurement operation
    if (operationType === 'measurement' && measuredParameter) {
      parameters[measuredParameter] = Number(measuredValue) || measuredValue;
    }

    // Create transition parameters object to be included in parameters
    const transitionParams: Record<string, any> = { 
      operation_type: operationType,
    };
    
    // Only add operation-specific parameters if they're defined
    if (operationType === 'start_new_culture' && formData.cell_type !== undefined) {
      transitionParams.cell_type = formData.cell_type;
    }
    
    if (operationType === 'passage') {
      if (formData.parent_end_density !== undefined) {
        transitionParams.parent_end_density = formData.parent_end_density;
      }
      if (parentState?.parameters?.transition_parameters?.cell_type) {
        transitionParams.cell_type = parentState.parameters.transition_parameters.cell_type;
      }
    }
    
    if (operationType === 'freeze') {
      if (formData.parent_end_density !== undefined) {
        transitionParams.parent_end_density = formData.parent_end_density;
      }
      if (formData.number_of_vials !== undefined) {
        transitionParams.number_of_vials = formData.number_of_vials;
      }
      if (formData.total_cells !== undefined) {
        transitionParams.total_cells = formData.total_cells;
      }
      if (parentState?.parameters?.transition_parameters?.cell_type) {
        transitionParams.cell_type = parentState.parameters.transition_parameters.cell_type;
      }
    }
    
    if (operationType === 'thaw') {
      if (formData.number_of_passages !== undefined) {
        transitionParams.number_of_passages = formData.number_of_passages;
      }
      if (parentState?.parameters?.transition_parameters?.cell_type) {
        transitionParams.cell_type = parentState.parameters.transition_parameters.cell_type;
      }
    }
    
    if (operationType === 'harvest') {
      if (formData.end_density !== undefined) {
        transitionParams.end_density = formData.end_density;
      }
      if (parentState?.parameters?.transition_parameters?.cell_type) {
        transitionParams.cell_type = parentState.parameters.transition_parameters.cell_type;
      }
    }

    // Add transition parameters to parameters
    parameters.transition_parameters = transitionParams;

    // For start_new_culture, parent_id should be undefined
    if (operationType === 'start_new_culture') {
      // Find all cell states that have this parent ID
      if (formData.parent_id) {
        console.warn('start_new_culture operation should not have a parent state. Removing parent_id.');
      }
      // Always set parent_id to undefined for start_new_culture
      statePayload.parent_id = undefined;
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

    // Update statePayload with finalName and timestamp
    statePayload.name = finalName;
    statePayload.timestamp = newTimestamp.toISOString(); // Use validated manual timestamp
    statePayload.additional_notes = notes;

    // For split operation, handle multiple states
    if (transitionType === 'split') {
      // Create a new base payload for split states
      const splitBasePayload = {
        ...statePayload
      };
      
      // If no split states, show error
      if (splitStates.length === 0) {
        alert('Please add at least one split state.');
        return;
      }

      // Unique names across all splits
      const splitNames = splitStates.map(s => s.name);
      if (new Set(splitNames).size !== splitNames.length) {
        alert('Each split state must have a unique name.');
        return;
      }

      // Notes for splits are shared
      const stateNotes = formData.additional_notes || '';
      
      // Handle split transition type
      let splitTransitionType: 'single' | 'split' | 'measurement' = 'split';
      
      // Create array of states to submit
      const statesToSubmit = splitStates.map(state => {
        // Note: We always use 'split' as the transition_type for all states created from a split operation
        // This ensures they are properly displayed in the process view
        const splitTransitionType: 'split' = 'split';
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
        
        // For harvest operations, we need to use cell_density as end_density in transition_parameters
        const transitionParams = { 
          operation_type: state.operation_type, // Keep the original operation type
          parent_end_density: formData.parent_end_density, // Include parent_end_density for all split states
          // Add a marker that this was created through a split
          from_split: true,
          ...(state.operation_type === 'harvest' ? { 
            end_density: state.cell_density,
            cell_type: parentState?.parameters?.transition_parameters?.cell_type || ''
          } : {}),
          ...(state.operation_type === 'passage' ? {
            cell_type: parentState?.parameters?.transition_parameters?.cell_type || ''
          } : {}),
          ...(state.operation_type === 'freeze' ? {
            number_of_vials: state.number_of_vials,
            total_cells: state.total_cells,
            cell_type: parentState?.parameters?.transition_parameters?.cell_type || ''
          } : {}) 
        };
        
        // Ensure name includes "Harvest" for harvest operations if not already specified
        let stateName = state.name;
        if (state.operation_type === 'harvest' && !stateName.toLowerCase().includes('harvest')) {
          stateName = stateName ? `Harvest: ${stateName}` : `Harvest of Split ${formData.name || 'Unknown'}`;
        }
        
        return {
          ...splitBasePayload, // Use split base payload
          name: stateName, // Use name with harvest prefix if needed
          parameters: { // Use split state parameters
            temperature_c: state.temperature_c,
            volume_ml: state.volume_ml,
            location: state.location,
            cell_density: state.cell_density,
            start_viability: state.start_viability,
            parent_end_viability: state.parent_end_viability,
            growth_rate: state.growth_rate,
            density_limit: state.density_limit,
            end_density: state.end_density,
            // Add cell_type to main parameters for consistency
            cell_type: parentState?.parameters?.transition_parameters?.cell_type || '',
            // Add transition parameters inside parameters
            transition_parameters: transitionParams
          },
          transition_type: splitTransitionType, // Always use 'split' type for states created from split operation
          // Remove from root level
          additional_notes: stateNotes,
        };
      });
      onSubmit(statesToSubmit)

    } else if (transitionType === 'measurement') {
      // For measurement, add the measurement value to parameters

      // Submit as measurement transition type
      onSubmit([
        {
          ...statePayload,
          parameters,
          transition_type: 'measurement'
        }
      ]);
    } else { // Single transition
      // Note: Measured doubling time will be calculated and added to the parent state in the States component
      
      onSubmit([{
        ...statePayload,
        parameters: {
          temperature_c: formData.temperature_c,
          volume_ml: formData.volume_ml,
          location: formData.location,
          cell_density: formData.cell_density,
          start_viability: formData.start_viability,
          parent_end_viability: formData.parent_end_viability,
          growth_rate: formData.growth_rate,
          doubling_time: formData.doubling_time,
          density_limit: formData.density_limit,
          end_density: formData.end_density,
          // Include cell_type in main parameters for display purposes
          ...(operationType === 'start_new_culture' ? { cell_type: formData.cell_type } : {}),
          // Add transition parameters inside the parameters object
          transition_parameters: transitionParams
        } as CellStateCreate['parameters'], // Explicitly type the parameters object
        transition_type: 'single',
        additional_notes: formData.additional_notes,
      }]);
    }
  }

  const addSplitState = () => {
    // Use defaults from operationDefaults for passage operation
    const passageDefaults = operationDefaults['passage'];
    
    setSplitStates([...splitStates, {
      name: "",
      temperature_c: passageDefaults.temperature_c || 37,
      volume_ml: passageDefaults.volume_ml || 20,
      location: passageDefaults.location || 'incubator',
      cell_density: passageDefaults.cell_density || 5e4,
      start_viability: undefined, // No default start_viability
      parent_end_viability: undefined, // No default parent_end_viability
      growth_rate: passageDefaults.growth_rate || 0,
      density_limit: passageDefaults.density_limit || 0,
      doubling_time: passageDefaults.doubling_time || 0,
      operation_type: 'passage',
      showOptionalParams: false,
      number_of_vials: 1,
      total_cells: 0,
      end_density: undefined // Add end_density property initialization
    }])
  }

  const removeSplitState = (index: number) => {
    setSplitStates(splitStates.filter((_, i) => i !== index))
  }

  // Add a utility function to prevent wheel events on number inputs
  const disableNumberInputScrolling = (event: Event) => {
    // Prevent the input value from changing when scrolling
    event.preventDefault();
    event.stopPropagation();
  };

  // Apply the wheel event handler to all number inputs when component mounts
  useEffect(() => {
    // Select all number inputs in the component
    const numberInputs = document.querySelectorAll('input[type="number"]');
    
    // Add the wheel event listener to each input
    numberInputs.forEach(input => {
      input.addEventListener('wheel', disableNumberInputScrolling, { passive: false });
    });
    
    // Clean up when component unmounts
    return () => {
      numberInputs.forEach(input => {
        input.removeEventListener('wheel', disableNumberInputScrolling);
      });
    };
  }, []);

  // Improve numerical input handling to allow empty state and precise values
  const handleNumericInput = (
    field: keyof typeof formData, 
    value: string, 
    multiplier: number = 1
  ) => {
    // Allow empty string for better UX (user can delete content)
    if (value === '') {
      setFormData(prev => ({ ...prev, [field]: undefined }));
      return;
    }
    
    // Convert to number without forcing rounding
    const numValue = parseFloat(value);
    
    // Only update if it's a valid number
    if (!isNaN(numValue)) {
      setFormData(prev => ({ ...prev, [field]: numValue * multiplier }));
    }
  };

  // Modify updateSplitState to better handle numeric values
  const updateSplitState = (index: number, field: string, value: any) => {
    const newSplitStates = [...splitStates];
    
    // Special handling for numeric fields
    if (typeof value === 'string' && 
        (field === 'cell_density' || field === 'temperature_c' || 
         field === 'volume_ml' || field === 'growth_rate' || 
         field === 'doubling_time' || field === 'density_limit' ||
         field === 'number_of_vials' || field === 'total_cells' ||
         field === 'viability')) {
       
      // Allow empty values for better UX
      if (value === '') {
        newSplitStates[index] = { ...newSplitStates[index], [field]: undefined };
      } else {
        // Parse as float for all numeric fields to allow decimals
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          if (field === 'cell_density') {
            // For cell_density, multiply by 1,000,000 if not already in the millions
            const finalValue = value.includes('000000') ? numValue : numValue * 1000000;
            newSplitStates[index] = { ...newSplitStates[index], [field]: finalValue };
          } else {
            newSplitStates[index] = { ...newSplitStates[index], [field]: numValue };
          }
        }
      }
    } else {
      // For non-numeric fields, just update the value
      newSplitStates[index] = { ...newSplitStates[index], [field]: value };
    }
    
    // Handle linked parameters (growth rate and doubling time)
    if ((field === 'growth_rate' || field === 'doubling_time') && value !== '') {
      const numericValue = typeof value === 'string' ? parseFloat(value) : value;
      
      if (!isNaN(numericValue) && numericValue > 0) {
        if (field === 'growth_rate') {
          newSplitStates[index].doubling_time = Math.log(2) / numericValue;
        } else { // field === 'doubling_time'
          newSplitStates[index].growth_rate = Math.log(2) / numericValue;
        }
      }
    }
    
    // If operation type is changed, apply the defaults for that operation
    if (field === 'operation_type' && typeof value === 'string') {
      const operationType = value as OperationType;
      const defaults = operationDefaults[operationType];
      
      // Apply defaults while keeping existing values for fields that are not in defaults
      // and preserving name
      newSplitStates[index] = { 
        ...newSplitStates[index], 
        ...defaults,
        name: newSplitStates[index].name,
        showOptionalParams: newSplitStates[index].showOptionalParams 
      };
    }
    
    setSplitStates(newSplitStates);
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
              <label className="block text-sm font-medium text-gray-700">Initial Cell Density (million cells/ml)</label>
              <input 
                type="number" 
                min="0" 
                step="any"
                className="mt-1 w-full p-2 border rounded"
                value={formData.cell_density ? formData.cell_density / 1000000 : ''}
                onChange={(e) => handleNumericInput('cell_density', e.target.value, 1000000)}
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
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('temperature_c')}</label>
                  <input 
                    type="number" 
                    step="any"
                    value={formData.temperature_c !== undefined ? formData.temperature_c : ''} 
                    onChange={(e) => handleNumericInput('temperature_c', e.target.value)} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Volume */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('volume_ml')}</label>
                  <input 
                    type="number" 
                    step="any"
                    value={formData.volume_ml !== undefined ? formData.volume_ml : ''} 
                    onChange={(e) => handleNumericInput('volume_ml', e.target.value)} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('location')}</label>
                  <input 
                    type="text" 
                    value={formData.location} 
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* End Density - Add for all operations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('end_density')}</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.001"
                    className="mt-1 w-full p-2 border rounded"
                    value={formData.end_density ? formData.end_density / 1000000 : ''} 
                    onChange={(e) => {
                      // Ensure we convert to a valid number
                      let value = e.target.value.trim();
                      if (value === '') {
                        setFormData({ ...formData, end_density: undefined });
                      } else {
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue)) {
                          // Store as absolute cell count, not millions
                          setFormData({ ...formData, end_density: numValue * 1000000 });
                        }
                      }
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-500">Final cell density at the end of this process</p>
                </div>
                
                {/* Viability */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('start_viability')}</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    step="any"
                    value={formData.start_viability !== undefined ? formData.start_viability : ''} 
                    onChange={(e) => handleNumericInput('start_viability', e.target.value)} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Growth Rate */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('growth_rate')}</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.growth_rate !== undefined ? formData.growth_rate : ''}
                    onChange={(e) => handleParameterChange('growth_rate', e.target.value)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 0.03 (per hour)"
                  />
                </div>
                
                {/* Doubling Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('doubling_time')}</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.doubling_time !== undefined ? formData.doubling_time : ''}
                    onChange={(e) => handleParameterChange('doubling_time', e.target.value)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 23.1 (hours)"
                  />
                  <p className="mt-1 text-xs text-gray-500">Calculated automatically if Growth Rate is entered, and vice-versa.</p>
                </div>
                
                {/* Density Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('density_limit')}</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.density_limit ? formData.density_limit / 1000000 : ''}
                    onChange={(e) => handleNumericInput('density_limit', e.target.value, 1000000)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 1.5 (million cells/ml)"
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
      const parentCellType = hasParent ? parentState.parameters?.transition_parameters?.cell_type || '' : '';
      
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
                    {parentState.parameters?.transition_parameters?.cell_type && (
                      <p><span className="font-medium">Cell Type:</span> {parentState.parameters.transition_parameters.cell_type}</p>
                    )}
                    <p><span className="font-medium">Current Density:</span> {(parentParameters.cell_density / 1000000)?.toLocaleString() || 'N/A'} million cells/ml</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 italic mb-4">
                  The cell type will be automatically inherited from the parent state.
                </p>
              </>
            )}
            
            {/* Parent End Cell Density */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Parent End Cell Density (million cells/ml)</label>
              <input 
                type="number" 
                min="0" 
                step="0.001"
                className="mt-1 w-full p-2 border rounded"
                value={formData.parent_end_density ? formData.parent_end_density / 1000000 : ''} 
                onChange={(e) => {
                  // Ensure we convert to a valid number
                  let value = e.target.value.trim();
                  if (value === '') {
                    setFormData({ ...formData, parent_end_density: undefined });
                  } else {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                      // Store as absolute cell count, not millions
                      setFormData({ ...formData, parent_end_density: numValue * 1000000 });
                    }
                  }
                }}
                required
                disabled={!hasParent}
              />
              <p className="mt-1 text-xs text-gray-500">Cell density at the time of freezing</p>
              <div className="mt-1 bg-yellow-50 p-2 rounded border border-yellow-200">
                <p className="text-sm text-yellow-800 font-medium">
                  <span role="img" aria-label="Important">⚠️</span> Important: This value is required to calculate doubling time. The doubling time will be automatically calculated when you create this state.
                </p>
              </div>
            </div>
            
            {/* New Passage Start Cell Density */}
            <div>
              <label className="block text-sm font-medium text-gray-700">New Passage Initial Cell Density (million cells/ml)</label>
              <input 
                type="number" 
                min="0" 
                step="0.001"
                className="mt-1 w-full p-2 border rounded"
                value={formData.cell_density / 1000000} 
                onChange={(e) => setFormData({ ...formData, cell_density: Number(e.target.value) * 1000000 })}
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
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('temperature_c')}</label>
                  <input 
                    type="number" 
                    step="any"
                    value={formData.temperature_c !== undefined ? formData.temperature_c : ''} 
                    onChange={(e) => handleNumericInput('temperature_c', e.target.value)} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Volume */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('volume_ml')}</label>
                  <input 
                    type="number" 
                    step="any"
                    value={formData.volume_ml !== undefined ? formData.volume_ml : ''} 
                    onChange={(e) => handleNumericInput('volume_ml', e.target.value)} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('location')}</label>
                  <input 
                    type="text" 
                    value={formData.location} 
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Viability */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('start_viability')}</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    step="any"
                    value={formData.start_viability !== undefined ? formData.start_viability : ''} 
                    onChange={(e) => handleNumericInput('start_viability', e.target.value)} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Growth Rate */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('growth_rate')}</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.growth_rate !== undefined ? formData.growth_rate : ''}
                    onChange={(e) => handleParameterChange('growth_rate', e.target.value)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 0.03 (per hour)"
                  />
                </div>
                
                {/* Doubling Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('doubling_time')}</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.doubling_time !== undefined ? formData.doubling_time : ''}
                    onChange={(e) => handleParameterChange('doubling_time', e.target.value)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 23.1 (hours)"
                  />
                  <p className="mt-1 text-xs text-gray-500">Calculated automatically if Growth Rate is entered, and vice-versa.</p>
                </div>
                
                {/* Density Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('density_limit')}</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.density_limit ? formData.density_limit / 1000000 : ''}
                    onChange={(e) => handleNumericInput('density_limit', e.target.value, 1000000)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 1.5 (million cells/ml)"
                  />
                </div>
                
                {/* End Density - Add for all operations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('end_density')}</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.001"
                    className="mt-1 w-full p-2 border rounded"
                    value={formData.end_density ? formData.end_density / 1000000 : ''} 
                    onChange={(e) => {
                      // Ensure we convert to a valid number
                      let value = e.target.value.trim();
                      if (value === '') {
                        setFormData({ ...formData, end_density: undefined });
                      } else {
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue)) {
                          // Store as absolute cell count, not millions
                          setFormData({ ...formData, end_density: numValue * 1000000 });
                        }
                      }
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-500">Final cell density reached in this passage (if different from parent_end_density)</p>
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
                    {parentState.parameters?.transition_parameters?.cell_type && (
                      <p><span className="font-medium">Cell Type:</span> {parentState.parameters.transition_parameters.cell_type}</p>
                    )}
                    <p><span className="font-medium">Current Density:</span> {(parentParameters.cell_density / 1000000)?.toLocaleString() || 'N/A'} million cells/ml</p>
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
                value={formData.number_of_vials || ''} 
                onChange={(e) => handleNumericInput('number_of_vials', e.target.value)}
                required
              />
            </div>
            
            {/* Parent End Cell Density */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Parent End Cell Density (million cells/ml)</label>
              <input 
                type="number" 
                min="0" 
                step="0.001"
                className="mt-1 w-full p-2 border rounded"
                value={formData.parent_end_density ? formData.parent_end_density / 1000000 : undefined} 
                onChange={(e) => setFormData(prev => ({ ...prev, parent_end_density: Number(e.target.value) * 1000000 }))}
                required
                disabled={!hasParent}
              />
              <p className="mt-1 text-xs text-gray-500">Cell density at the time of freezing</p>
              <div className="mt-1 bg-yellow-50 p-2 rounded border border-yellow-200">
                <p className="text-sm text-yellow-800 font-medium">
                  <span role="img" aria-label="Important">⚠️</span> Important: This value is required to calculate doubling time. The doubling time will be automatically calculated when you create this state.
                </p>
              </div>
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
                step="any"
                className="mt-1 w-full p-2 border rounded"
                value={formData.total_cells || ''} 
                onChange={(e) => handleNumericInput('total_cells', e.target.value)}
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
              <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('location')}</label>
              <input 
                type="text" 
                className="mt-1 w-full p-2 border rounded"
                value={formData.location} 
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Freezer 2, Box A, Position A1"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Storage location of these vials (required for freeze operations)</p>
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
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('parent_end_viability')}</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    step="any"
                    value={formData.parent_end_viability !== undefined ? formData.parent_end_viability : ''} 
                    onChange={(e) => handleNumericInput('parent_end_viability', e.target.value)} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Growth Rate */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('growth_rate')}</label>
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
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('doubling_time')}</label>
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
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('density_limit')}</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.density_limit ? formData.density_limit / 1000000 : undefined}
                    onChange={(e) => handleParameterChange('density_limit', Number(e.target.value) * 1000000)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 1.5 (million cells/ml)"
                  />
                </div>
                
                {/* End Density - Add for all operations */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('end_density')}</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.001"
                    className="mt-1 w-full p-2 border rounded"
                    value={formData.end_density ? formData.end_density / 1000000 : ''} 
                    onChange={(e) => {
                      // Ensure we convert to a valid number
                      let value = e.target.value.trim();
                      if (value === '') {
                        setFormData({ ...formData, end_density: undefined });
                      } else {
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue)) {
                          // Store as absolute cell count, not millions
                          setFormData({ ...formData, end_density: numValue * 1000000 });
                        }
                      }
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-500">Final cell density when freezing</p>
                </div>
              </div>
            )}
          </div>
        </>
      );
    } else if (operationType === 'thaw') {
      // Check if parent (frozen vial) exists
      const hasParent = !!parentState;
      const isFrozenVial = hasParent && parentState.parameters?.transition_parameters?.operation_type === 'freeze';
      const parentCellType = hasParent ? parentState.parameters?.transition_parameters?.cell_type || '' : '';
      
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
                    {parentState.parameters?.transition_parameters?.cell_type && (
                      <p><span className="font-medium">Cell Type:</span> {parentState.parameters.transition_parameters.cell_type}</p>
                    )}
                    {parentState.parameters?.transition_parameters?.total_cells && (
                      <p><span className="font-medium">Total Cells:</span> {Number(parentState.parameters.transition_parameters.total_cells).toLocaleString()} cells</p>
                    )}
                    {parentState.parameters?.location && (
                      <p><span className="font-medium">Location:</span> {parentState.parameters.location}</p>
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
                value={formData.number_of_passages || ''} 
                onChange={(e) => handleNumericInput('number_of_passages', e.target.value)}
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
              <label className="block text-sm font-medium text-gray-700">New Passage Initial Cell Density (million cells/ml)</label>
              <input 
                type="number" 
                min="0" 
                step="0.001"
                className="mt-1 w-full p-2 border rounded"
                value={formData.cell_density / 1000000} 
                onChange={(e) => setFormData({ ...formData, cell_density: Number(e.target.value) * 1000000 })}
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
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('temperature_c')}</label>
                  <input 
                    type="number" 
                    value={formData.temperature_c} 
                    onChange={(e) => setFormData({ ...formData, temperature_c: Number(e.target.value) })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Volume */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('volume_ml')}</label>
                  <input 
                    type="number" 
                    value={formData.volume_ml} 
                    onChange={(e) => setFormData({ ...formData, volume_ml: Number(e.target.value) })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('location')}</label>
                  <input 
                    type="text" 
                    value={formData.location} 
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Viability */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('start_viability')}</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={formData.start_viability} 
                    onChange={(e) => setFormData({ ...formData, start_viability: Number(e.target.value) })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Growth Rate */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('growth_rate')}</label>
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
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('doubling_time')}</label>
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
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('density_limit')}</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.density_limit ? formData.density_limit / 1000000 : undefined}
                    onChange={(e) => handleParameterChange('density_limit', Number(e.target.value) * 1000000)}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="e.g., 1.5 (million cells/ml)"
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
                    {parentState.parameters?.transition_parameters?.cell_type && (
                      <p><span className="font-medium">Cell Type:</span> {parentState.parameters.transition_parameters.cell_type}</p>
                    )}
                    <p><span className="font-medium">Current Density:</span> {(parentParameters.cell_density / 1000000)?.toLocaleString() || 'N/A'} million cells/ml</p>
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
              <label className="block text-sm font-medium text-gray-700">End Cell Density (million cells/ml)</label>
              <input 
                type="number" 
                min="0" 
                step="any"
                className="mt-1 w-full p-2 border rounded"
                value={formData.end_density ? formData.end_density / 1000000 : ''} 
                onChange={(e) => handleNumericInput('end_density', e.target.value, 1000000)}
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
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('parent_end_viability')}</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={formData.parent_end_viability} 
                    onChange={(e) => setFormData({ ...formData, parent_end_viability: Number(e.target.value) })} 
                    className="mt-1 w-full p-2 border rounded" 
                  />
                </div>
                
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('location')}</label>
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
          <label className="block text-sm font-medium text-gray-700">Hypothesized Growth Rate (per hour)</label>
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
          <label className="block text-sm font-medium text-gray-700">Hypothesized Doubling Time (optional)</label>
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
          <label className="block text-sm font-medium text-gray-700">Hypothesized Density Limit (million cells/ml)</label>
          <input
            type="number"
            step="any"
            value={formData.density_limit ? formData.density_limit / 1000000 : undefined}
            onChange={(e) => handleParameterChange('density_limit', Number(e.target.value) * 1000000)}
            className="mt-1 w-full p-2 border rounded"
            placeholder="e.g., 1.5 (million cells/ml)"
          />
        </div>
        {/* Cell Density */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Initial Cell Density</label>
          <input type="number" value={formData.cell_density} onChange={(e) => setFormData({ ...formData, cell_density: Number(e.target.value) })} className="mt-1 w-full p-2 border rounded" />
        </div>
        {/* Viability */}
        <div>
          <label className="block text-sm font-medium text-gray-700">{getParameterDisplayName('start_viability')}</label>
          <input type="number" min="0" max="100" value={formData.start_viability} onChange={(e) => setFormData({ ...formData, start_viability: Number(e.target.value) })} className="mt-1 w-full p-2 border rounded" />
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
      
      {/* State Name - Hidden for split operation */}
      {transitionType !== 'split' && (
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
      )}

      {/* Operation Type Selection - MOVED UP ABOVE PARENT SELECTION */}
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
          <option value="measurement">Measurement (beta)</option>
          <option 
            value="split" 
            style={{fontWeight: 'bold', color: '#2563eb', backgroundColor: '#eff6ff'}}
          >
            Split Culture (creates multiple states)
          </option>
        </select>
      </div>

      {/* Parent State Selection - Hidden for Start New Culture */}
      {operationType !== 'start_new_culture' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Parent State
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
          Time
        </label>
        <input
          type="datetime-local"
          className="mt-1 w-full p-2 border rounded"
          value={manualTimestamp}
          onChange={(e) => setManualTimestamp(e.target.value)}
          required
        />
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
              step="any" // Add step="any" for numeric inputs
            />
          </div>
        </div>
      )}


      {/* Split Transition Form - Conditionally Rendered */}
      {transitionType === 'split' && splitStates.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-800">Split State Details</h4>
          
          {/* Parent End Density - Required for split operations */}
          <div className="mb-4 p-4 border rounded-lg bg-blue-50">
            <label className="block text-sm font-medium text-gray-700">
              Parent End Cell Density (million cells/ml)
            </label>
            <input
              type="number"
              min="0"
              step="0.001"
              className="mt-1 w-full p-2 border rounded"
              value={formData.parent_end_density ? formData.parent_end_density / 1000000 : undefined}
              onChange={(e) => setFormData(prev => ({ ...prev, parent_end_density: Number(e.target.value) * 1000000 }))}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Cell density of the parent culture at the time of splitting (required)
            </p>
            <div className="mt-1 bg-yellow-50 p-2 rounded border border-yellow-200">
              <p className="text-sm text-yellow-800 font-medium">
                <span role="img" aria-label="Important">⚠️</span> Important: This value is required to calculate the parent's doubling time. The doubling time will be automatically calculated when you create these split states.
              </p>
            </div>
          </div>
          
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
                  <option value="harvest">Harvest (Throw Away)</option>
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
                {/* Cell Parameters based on operation type */}
                <div className="space-y-2">
                  {state.operation_type === 'harvest' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        End Cell Density (million cells/ml)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        className="mt-1 w-full p-2 border rounded"
                        value={state.cell_density / 1000000} 
                        onChange={(e) => updateSplitState(index, 'cell_density', parseFloat(e.target.value) * 1000000)}
                      />
                      <p className="mt-1 text-xs text-gray-500">Final cell density at the time of harvest</p>
                    </div>
                  ) : state.operation_type === 'freeze' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Number of Frozen Vials
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="mt-1 w-full p-2 border rounded"
                          value={state.number_of_vials || ''} 
                          onChange={(e) => updateSplitState(index, 'number_of_vials', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Total Cells per Vial
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="mt-1 w-full p-2 border rounded"
                          value={state.total_cells || ''} 
                          onChange={(e) => updateSplitState(index, 'total_cells', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Vial Volume (ml)
                        </label>
                        <input
                          type="number"
                          step="any"
                          className="mt-1 w-full p-2 border rounded"
                          value={state.volume_ml || ''}
                          onChange={(e) => updateSplitState(index, 'volume_ml', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Storage Temperature (°C)
                        </label>
                        <input
                          type="number"
                          step="any"
                          className="mt-1 w-full p-2 border rounded"
                          value={state.temperature_c || ''}
                          onChange={(e) => updateSplitState(index, 'temperature_c', e.target.value)}
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
                          placeholder="e.g., Freezer 2, Box A, Position A1"
                        />
                        <p className="mt-1 text-xs text-gray-500">Specific storage location of vials</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {state.operation_type === 'passage' ? 'New Passage Initial Cell Density (million cells/ml)' : 'Initial Cell Density (million cells/ml)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="mt-1 w-full p-2 border rounded"
                        value={state.cell_density ? state.cell_density / 1000000 : ''}
                        onChange={(e) => updateSplitState(index, 'cell_density', e.target.value)}
                      />
                    </div>
                  )}
                  
                  {/* Viability is essential only for passage */}
                  {state.operation_type === 'passage' && (
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
                  )}
                </div>
                
                {/* State Parameters - Moved to optional parameters */}
                {/* Empty div to preserve structure */}
                <div></div>
              </div>
              
              {/* Show/Hide Optional Parameters Toggle */}
              <div className="pt-3">
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  onClick={() => {
                    // Create new split states array
                    const newSplitStates = [...splitStates];
                    // Toggle showOptionalParams for this state (add if not exists)
                    newSplitStates[index] = { 
                      ...newSplitStates[index], 
                      showOptionalParams: !newSplitStates[index].showOptionalParams 
                    };
                    setSplitStates(newSplitStates);
                  }}
                >
                  {state.showOptionalParams ? '↑ Hide' : '↓ Show'} Optional Parameters
                </button>
              </div>
              
              {/* Optional Parameters Section */}
              {state.showOptionalParams && (
                <div className="space-y-3 mt-3 pl-2 border-l-2 border-gray-200">
                  {/* Temperature - only show if not freeze */}
                  {state.operation_type !== 'freeze' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Temperature (°C)</label>
                      <input
                        type="number"
                        className="mt-1 w-full p-2 border rounded"
                        value={state.temperature_c || ''}
                        onChange={(e) => updateSplitState(index, 'temperature_c', e.target.value)}
                      />
                    </div>
                  )}
                  
                  {/* Volume - only show if not freeze */}
                  {state.operation_type !== 'freeze' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Volume (ml)</label>
                      <input
                        type="number"
                        className="mt-1 w-full p-2 border rounded"
                        value={state.volume_ml || ''}
                        onChange={(e) => updateSplitState(index, 'volume_ml', e.target.value)}
                      />
                    </div>
                  )}
                  
                  {/* Location - only show if not freeze */}
                  {state.operation_type !== 'freeze' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <input
                        type="text"
                        className="mt-1 w-full p-2 border rounded"
                        value={state.location}
                        onChange={(e) => updateSplitState(index, 'location', e.target.value)}
                      />
                    </div>
                  )}
                  
                  {/* Viability - only show if not passage */}
                  {state.operation_type !== 'passage' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Viability (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="mt-1 w-full p-2 border rounded"
                        value={state.viability || ''}
                        onChange={(e) => updateSplitState(index, 'viability', e.target.value)}
                      />
                    </div>
                  )}
                  
                  {/* Growth Rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hypothesized Growth Rate (per hour)</label>
                    <input
                      type="number"
                      step="any"
                      value={state.growth_rate || ''}
                      onChange={(e) => updateSplitState(index, 'growth_rate', e.target.value)}
                      className="mt-1 w-full p-2 border rounded"
                      placeholder="e.g., 0.03 (per hour)"
                    />
                  </div>
                  
                  {/* Doubling Time - Add this calculation later */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hypothesized Doubling Time (hours)</label>
                    <input
                      type="number"
                      step="any"
                      value={state.doubling_time || ''}
                      onChange={(e) => updateSplitState(index, 'doubling_time', e.target.value)}
                      className="mt-1 w-full p-2 border rounded"
                      placeholder="e.g., 23.1 (hours)"
                    />
                    <p className="mt-1 text-xs text-gray-500">Calculated automatically if Growth Rate is entered, and vice-versa.</p>
                  </div>
                  
                  {/* Density Limit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hypothesized Density Limit (million cells/ml)</label>
                    <input
                      type="number"
                      step="any"
                      value={state.density_limit ? state.density_limit / 1000000 : ''}
                      onChange={(e) => updateSplitState(index, 'density_limit', e.target.value)}
                      className="mt-1 w-full p-2 border rounded"
                      placeholder="e.g., 1.5 (million cells/ml)"
                    />
                  </div>
                  
                  {/* End Density - add for split operations too */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Density (million cells/ml)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      className="mt-1 w-full p-2 border rounded"
                      value={state.end_density ? state.end_density / 1000000 : ''}
                      onChange={(e) => {
                        let value = e.target.value.trim();
                        if (value === '') {
                          updateSplitState(index, 'end_density', undefined);
                        } else {
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue)) {
                            updateSplitState(index, 'end_density', numValue * 1000000);
                          }
                        }
                      }}
                      placeholder="Final cell density (million cells/ml)"
                    />
                    <p className="mt-1 text-xs text-gray-500">Final cell density at the end of this split</p>
                  </div>
                  
                  {/* Additional operation-specific optional parameters */}
                  {state.operation_type === 'freeze' && (
                    <>
                      {/* No additional parameters needed for freeze operations */}
                    </>
                  )}
                </div>
              )}
              
              {/* Harvest Warning */}
              {state.operation_type === 'harvest' && (
                <div className="bg-amber-50 p-3 rounded border mt-2">
                  <p className="text-amber-700 text-sm">
                    ⚠️ Harvest is a terminal operation. This portion of the culture will be considered harvested and cannot be used as a parent for future operations.
                  </p>
                </div>
              )}
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