# Parameter System Migration Guide

This document provides guidance for continuing the migration to the new parameter system.

## Background

The parameter system has been refactored to have a single source of truth for parameter definitions:
- Backend: `api/app/utils/parameters.py`
- Frontend: `ui/src/utils/parameters.ts`

This makes it easier to add, modify, or remove parameters without changing multiple files.

## Migration Status

### Completed:
- ✅ Created centralized parameter definitions
- ✅ Added API endpoint for parameter definitions 
- ✅ Implemented parameter context provider
- ✅ Created reusable parameter components
- ✅ Updated NodeDetailsPanel to use parameter context
- ✅ Updated RawListView to use parameter context
- ✅ Added CLI tool for parameter management

### In Progress:
- ⏳ Migrate CreateStateForm to use parameter components
- ⏳ Update States.tsx to import parameter definitions
- ⏳ Add comprehensive tests

## How to Add a New Parameter

Use the CLI tool to add a new parameter:

```bash
# Add a global parameter
cd api/app
./utils/add_parameter.py my_parameter "My Parameter" --global

# Add an operation-specific parameter
cd api/app
./utils/add_parameter.py my_operation_param "My Operation Param" --operations freeze thaw
```

## Next Migration Steps

1. **Update `CreateStateForm.tsx`**:
   - Replace hardcoded parameter fields with `ParameterForm` component
   - Remove duplicate parameter definitions
   - Handle operation-specific parameters dynamically

   ```tsx
   import ParameterForm from '../components/ParameterForm';
   
   // Replace existing parameter fields with:
   <ParameterForm
     operationType={operationType}
     parameters={formData}
     onChange={handleParameterChange}
     showOptionalParams={showOptionalParams}
   />
   ```

2. **Update `States.tsx`**:
   - Remove hardcoded operation parameter mappings
   - Import centralized definitions from `utils/parameters.ts`
   - Use `isParameterApplicable` for parameter visibility

3. **Create Unit and Integration Tests**:
   - Add tests for `ParameterField`, `ParameterForm`, and `ParameterUtils`
   - Test parameter rendering with different operation types
   - Test API integration for parameter definitions

## Best Practices

1. **Always Use the Parameter System**:
   - Import `useParameters()` instead of using hardcoded parameter lists
   - Use `ParameterField` and `ParameterForm` components for forms
   - Consider parameter applicability for different operation types

2. **Adding Custom Parameters**:
   - Add parameters through the CLI tool
   - If needed, extend parameter metadata with additional properties
   - Update `ParameterField` to handle special parameter types

3. **Runtime Configuration**:
   - Consider using the API endpoint for dynamic parameters
   - Fetch parameter definitions from backend when possible 