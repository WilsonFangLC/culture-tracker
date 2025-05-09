import React from 'react';
import { useParameters } from './ParameterUtils';
import ParameterField from './ParameterField';

interface ParameterFormProps {
  operationType: string;
  parameters: Record<string, any>;
  onChange: (paramKey: string, value: any) => void;
  showOptionalParams?: boolean;
}

/**
 * A component that renders a form with all applicable parameters for an operation type
 */
const ParameterForm: React.FC<ParameterFormProps> = ({
  operationType,
  parameters,
  onChange,
  showOptionalParams = false
}) => {
  const { parameterMetadata, allPossibleParameters, isParameterApplicable } = useParameters();
  
  // Get all applicable parameters for this operation type
  const applicableParams = allPossibleParameters.filter(param => 
    isParameterApplicable(param, operationType)
  );
  
  // Split into required and optional parameters
  // For simplicity, we'll consider common parameters like temperature, volume, location as required
  const commonParams = ['temperature_c', 'volume_ml', 'location', 'cell_density', 'viability'];
  
  const requiredParams = applicableParams.filter(param => 
    commonParams.includes(param) || parameterMetadata[param]?.applicableToAllNodes
  );
  
  const optionalParams = applicableParams.filter(param => 
    !commonParams.includes(param) && !parameterMetadata[param]?.applicableToAllNodes
  );
  
  return (
    <div className="parameter-form">
      <div className="required-parameters space-y-4">
        {requiredParams.map(param => (
          <ParameterField
            key={param}
            paramKey={param}
            value={parameters[param]}
            onChange={(value) => onChange(param, value)}
            operationType={operationType}
          />
        ))}
      </div>
      
      {optionalParams.length > 0 && (
        <div className="mt-4">
          <div 
            className="mb-2 text-blue-600 cursor-pointer hover:underline"
            onClick={() => onChange('showOptionalParams', !showOptionalParams)}
          >
            {showOptionalParams ? '▼ Hide optional parameters' : '► Show optional parameters'}
          </div>
          
          {showOptionalParams && (
            <div className="optional-parameters space-y-4 p-3 border border-gray-200 rounded">
              {optionalParams.map(param => (
                <ParameterField
                  key={param}
                  paramKey={param}
                  value={parameters[param]}
                  onChange={(value) => onChange(param, value)}
                  operationType={operationType}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ParameterForm; 