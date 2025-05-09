# Culture Tracker Frontend Parameter System

## Overview

The Culture Tracker frontend uses a centralized parameter system to handle operation-specific parameters, making it easy to add, modify, or remove parameters without changing multiple files.

## Architecture

The parameter system consists of:

1. **Parameter Definitions**: Central parameter definitions in `src/utils/parameters.ts`
2. **Parameter Context**: A React context provider in `src/components/ParameterUtils.tsx`
3. **Parameter Component**: Reusable form field component in `src/components/ParameterField.tsx`
4. **API Integration**: Parameter definitions can be loaded from the API

## Using Parameters in Components

### Basic Usage

```tsx
import { useParameters } from '../components/ParameterUtils';

function MyComponent() {
  const { 
    parameterMetadata, 
    allPossibleParameters, 
    isParameterApplicable 
  } = useParameters();
  
  // Check if a parameter applies to an operation
  const applicable = isParameterApplicable('temperature_c', 'passage');
  
  // Get parameter display name
  const displayName = parameterMetadata['temperature_c']?.displayName;
  
  // Use all parameters
  const allParams = allPossibleParameters;
  
  // ...
}
```

### Form Fields

Use the `ParameterField` component for automatic parameter rendering:

```tsx
import ParameterField from '../components/ParameterField';

function MyForm() {
  const [formData, setFormData] = useState({
    temperature_c: 37,
    volume_ml: 10,
    // ...
  });
  
  const handleChange = (paramKey, value) => {
    setFormData(prev => ({
      ...prev,
      [paramKey]: value
    }));
  };
  
  return (
    <form>
      <ParameterField
        paramKey="temperature_c"
        value={formData.temperature_c}
        onChange={(value) => handleChange('temperature_c', value)}
        operationType="passage"
      />
      
      {/* More fields... */}
    </form>
  );
}
```

## Adding a New Parameter

To add a new parameter:

1. Update the central definition in `src/utils/parameters.ts`:

```tsx
export const ALL_PARAMETER_METADATA: Record<string, ParameterMetadata> = {
  // ... existing parameters
  "my_new_parameter": { 
    displayName: "My New Parameter", 
    applicableToAllNodes: false, 
    operationSpecific: ['start_new_culture', 'passage'] 
  },
};

export const OPERATION_PARAMETER_MAPPING: Record<OperationType, string[]> = {
  start_new_culture: [
    // ... existing parameters
    'my_new_parameter',
  ],
  passage: [
    // ... existing parameters
    'my_new_parameter',
  ],
  // ... other operations
};
```

2. That's it! Your new parameter will be automatically recognized by all components using the parameter system.

## Backend Integration

The system automatically fetches parameter definitions from the API endpoint:

```
GET /api/parameters/definitions
```

This allows you to update parameters on the backend without having to update the frontend code. 