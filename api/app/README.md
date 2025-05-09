# Culture Tracker API Parameter System

## Overview

The parameter system in Culture Tracker provides a centralized way to define, validate, and manage operation-specific parameters in both the API and UI.

## Parameter Definition Structure

Parameters are defined in `api/app/utils/parameters.py` with the following structure:

```python
# Define which parameters apply to which operation types
OPERATION_PARAMETER_MAPPING = {
    'start_new_culture': ['temperature_c', 'volume_ml', ...],
    'passage': ['temperature_c', 'volume_ml', ...],
    # ...
}

# Define all possible parameters with metadata
ALL_PARAMETER_METADATA = {
    "temperature_c": {"displayName": "Temperature (°C)", "applicableToAllNodes": True},
    "volume_ml": {"displayName": "Volume (ml)", "applicableToAllNodes": True},
    # ...
}
```

## How to Add a New Parameter

### Using the CLI Tool

The easiest way to add a new parameter is using the provided CLI tool:

```
# Add a global parameter
./utils/add_parameter.py my_parameter "My Parameter" --global

# Add an operation-specific parameter
./utils/add_parameter.py my_operation_param "My Operation Param" --operations freeze thaw
```

### Manual Process

To add a new parameter manually:

1. Add the parameter to `ALL_PARAMETER_METADATA` in `api/app/utils/parameters.py`, including:
   - `displayName`: Human-readable name for display
   - `applicableToAllNodes`: Whether it's common to all operation types
   - `operationSpecific`: If not applicable to all nodes, list which operations it applies to

2. Add the parameter to the appropriate operations in `OPERATION_PARAMETER_MAPPING`

3. No database schema changes are needed as parameters are stored in a flexible JSON column

## Frontend Usage

The frontend uses a context-based parameter system:

1. Import the parameter utilities:
   ```tsx
   import { useParameters } from '../components/ParameterUtils';
   ```

2. Use the hook in your component:
   ```tsx
   const { 
     parameterMetadata,
     operationParameterMapping,
     allPossibleParameters, 
     isParameterApplicable
   } = useParameters();
   ```

3. For form fields, use the `ParameterField` component:
   ```tsx
   <ParameterField
     paramKey="temperature_c"
     value={formData.temperature_c}
     onChange={(value) => handleParameterChange('temperature_c', value)}
     operationType={operationType}
   />
   ```

4. For complete parameter forms, use the `ParameterForm` component:
   ```tsx
   <ParameterForm
     operationType="start_new_culture"
     parameters={formData}
     onChange={handleParameterChange}
     showOptionalParams={showOptionalParams}
   />
   ```

## API Endpoint

Parameters can be fetched from the API using the endpoint:

```
GET /api/parameters/definitions
```

This returns:
- `operation_parameter_mapping`: Which parameters apply to which operations
- `parameter_metadata`: Metadata about each parameter
- `all_possible_parameters`: List of all parameter keys

## Testing

Parameter components and utilities can be tested using the test framework:

```
npm test -- parameters.test.tsx
``` 