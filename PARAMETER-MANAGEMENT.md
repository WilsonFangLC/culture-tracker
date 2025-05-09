# Parameter Management Guide for Cell Culture Tracker

This guide outlines the complete process for adding, modifying, or removing parameters in the Cell Culture Tracker application. Following these steps ensures consistency across the application and prevents bugs.

## Understanding Parameter Architecture

Parameters in Cell Culture Tracker are centrally defined but used throughout the application. The system uses a central metadata repository to maintain consistent parameter definitions, display names, and operation-type associations.

## Step-by-Step Process for Parameter Changes

### 1. Update Central Parameter Definitions

Start by updating the core parameter definition files:

#### Frontend (`ui/src/utils/parameters.ts`)

```typescript
// Step 1: Add parameter to relevant operation types in OPERATION_PARAMETER_MAPPING
export const OPERATION_PARAMETER_MAPPING: Record<OperationType, string[]> = {
  start_new_culture: ['temperature_c', 'your_new_parameter', ...],
  // update other operation types as needed
};

// Step 2: Define parameter metadata in ALL_PARAMETER_METADATA
export const ALL_PARAMETER_METADATA: Record<string, ParameterMetadata> = {
  // ... existing parameters ...
  "your_new_parameter": { 
    displayName: "Your Parameter Display Name", 
    applicableToAllNodes: false, 
    operationSpecific: ['start_new_culture', 'passage'] // list applicable operations
  },
};
```

#### Backend (`api/app/utils/parameters.py`)

```python
# Update the same structures in the backend file
OPERATION_PARAMETER_MAPPING: Dict[str, List[str]] = {
    'start_new_culture': ['temperature_c', 'your_new_parameter', ...],
    # update other operation types as needed
}

ALL_PARAMETER_METADATA: Dict[str, Dict[str, Union[str, bool, List[str]]]] = {
    # ... existing parameters ...
    "your_new_parameter": {
        "displayName": "Your Parameter Display Name",
        "applicableToAllNodes": False,
        "operationSpecific": ['start_new_culture', 'passage']
    },
}
```

### 2. Update Form Components

#### `ui/src/components/CreateStateForm.tsx`

- Add the parameter to `formData` state type definition
- Add default values to `operationDefaults` for relevant operations
- Add form fields for the parameter in each relevant operation type's form section
- Update the `handleSubmit` function to include the parameter in submissions

#### `ui/src/components/EditStateForm.tsx`

- Add form fields for the parameter
- Include the parameter in the filter list for `DynamicParameters` if needed

#### `ui/src/components/ParameterField.tsx`

- If the parameter is numeric, add it to the `numericParams` array
- Add special rendering logic if needed (e.g., for percentages, densities)

### 3. Update Display Components

#### `ui/src/pages/States.tsx`

- Update state list or details views that display the parameter

#### `ui/src/components/NodeDetailsPanel.tsx`

- Update parameter display in node details panel

#### `ui/src/components/ProcessGraph.tsx`

- Update graph visualization if it displays this parameter

#### `ui/src/pages/RawListView.tsx`

- Update raw data display to include the parameter

### 4. Update Export Functionality

#### `api/app/routers/export.py`

- Update CSV export column definitions
- Update any formatters or display name mappings

### 5. Update Backend Components

#### API Endpoint Handlers

- Update request/response models in relevant endpoints
- Update validation logic for the parameter

#### Database Migrations

- If parameter requires schema changes, create migration scripts

### 6. Update Testing

- Update test cases that verify parameter behavior
- Update mock data to include the parameter
- Update `parameters.test.tsx` if needed

### 7. Special Handling for Parameter Types

#### For Measurement Parameters

- If applicable, add to `measurableParameters` array in CreateStateForm.tsx

#### For Split Operation Parameters

- Update split state type definitions
- Add fields to split state forms

#### For Calculated Parameters

- Update calculation logic in relevant utility files

## Testing Your Changes

1. Create new states with the parameter
2. Edit existing states to add/modify the parameter
3. Verify parameter display in all views
4. Test export functionality
5. Test search/filter by the parameter (if applicable)

## Common Issues and Solutions

- **Inconsistent Display**: Check if parameter is using `getParameterDisplayName()` throughout the UI
- **Missing in Exports**: Check export mapping in `api/app/routers/export.py`
- **Form Validation Errors**: Ensure parameter type handling is consistent
- **Backend Errors**: Verify backend models and validation match frontend expectations

---

Following this guide ensures that parameter changes are implemented consistently throughout the application, reducing bugs and maintaining a coherent user experience.
