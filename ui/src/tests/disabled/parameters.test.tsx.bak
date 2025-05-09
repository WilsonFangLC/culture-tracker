import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParameterProvider } from '../components/ParameterUtils';
import ParameterField from '../components/ParameterField';
import ParameterForm from '../components/ParameterForm';

// Mock the API hook
jest.mock('../api', () => ({
  useParameterDefinitions: () => ({
    data: {
      parameter_metadata: {
        "temperature_c": { displayName: "Temperature (°C)", applicableToAllNodes: true },
        "volume_ml": { displayName: "Volume (ml)", applicableToAllNodes: true },
        "cell_density": { displayName: "Initial Cell Density", applicableToAllNodes: true },
        "storage_location": { displayName: "Storage Location", applicableToAllNodes: false, operationSpecific: ['freeze'] }
      },
      operation_parameter_mapping: {
        'start_new_culture': ['temperature_c', 'volume_ml', 'cell_density'],
        'freeze': ['temperature_c', 'volume_ml', 'cell_density', 'storage_location'],
      },
      all_possible_parameters: ['temperature_c', 'volume_ml', 'cell_density', 'storage_location']
    },
    isLoading: false,
    error: null
  })
}));

// Wrapper for tests that provides the ParameterProvider
const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ParameterProvider>
    {children}
  </ParameterProvider>
);

describe('Parameter System', () => {
  describe('ParameterField', () => {
    test('renders correctly for temperature field', () => {
      const handleChange = jest.fn();
      
      render(
        <Wrapper>
          <ParameterField
            paramKey="temperature_c"
            value={37}
            onChange={handleChange}
            operationType="start_new_culture"
          />
        </Wrapper>
      );
      
      // Should show the field with correct label
      expect(screen.getByLabelText('Temperature (°C)')).toBeInTheDocument();
      
      // Should show the correct value
      const input = screen.getByLabelText('Temperature (°C)') as HTMLInputElement;
      expect(input.value).toBe('37');
      
      // Should call onChange when the value changes
      fireEvent.change(input, { target: { value: '40' } });
      expect(handleChange).toHaveBeenCalledWith(40);
    });
    
    test('does not render when parameter is not applicable', () => {
      const handleChange = jest.fn();
      
      render(
        <Wrapper>
          <ParameterField
            paramKey="storage_location"
            value="Box 1"
            onChange={handleChange}
            operationType="start_new_culture"
          />
        </Wrapper>
      );
      
      // Storage location should not be in the document for start_new_culture
      expect(screen.queryByText('Storage Location')).not.toBeInTheDocument();
    });
  });
  
  describe('ParameterForm', () => {
    test('renders all applicable parameters for operation type', () => {
      const handleChange = jest.fn();
      const parameters = {
        temperature_c: 37,
        volume_ml: 10,
        cell_density: 100000
      };
      
      render(
        <Wrapper>
          <ParameterForm
            operationType="start_new_culture"
            parameters={parameters}
            onChange={handleChange}
          />
        </Wrapper>
      );
      
      // Should show all applicable fields
      expect(screen.getByLabelText('Temperature (°C)')).toBeInTheDocument();
      expect(screen.getByLabelText('Volume (ml)')).toBeInTheDocument();
      expect(screen.getByLabelText('Initial Cell Density')).toBeInTheDocument();
      
      // Storage location should not be rendered
      expect(screen.queryByText('Storage Location')).not.toBeInTheDocument();
    });
    
    test('renders operation-specific parameters for freeze', () => {
      const handleChange = jest.fn();
      const parameters = {
        temperature_c: -80,
        volume_ml: 1,
        cell_density: 1000000,
        storage_location: 'Box 1'
      };
      
      render(
        <Wrapper>
          <ParameterForm
            operationType="freeze"
            parameters={parameters}
            onChange={handleChange}
            showOptionalParams={true}
          />
        </Wrapper>
      );
      
      // Should show all applicable fields including storage location
      expect(screen.getByLabelText('Temperature (°C)')).toBeInTheDocument();
      expect(screen.getByLabelText('Volume (ml)')).toBeInTheDocument();
      expect(screen.getByLabelText('Initial Cell Density')).toBeInTheDocument();
      expect(screen.getByLabelText('Storage Location')).toBeInTheDocument();
    });
  });
}); 