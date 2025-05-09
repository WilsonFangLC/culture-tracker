import React, { createContext, useContext, useEffect, useState } from 'react';
import { useParameterDefinitions } from '../api';
import {
  ALL_PARAMETER_METADATA,
  ALL_POSSIBLE_PARAMETERS,
  OPERATION_PARAMETER_MAPPING,
  OperationType,
  ParameterDefinitions,
  ParameterMetadata,
  isParameterApplicable as baseIsParameterApplicable
} from '../utils/parameters';

/**
 * Context that provides parameter definitions and utilities
 */
interface ParameterContextType {
  // Parameter definitions
  parameterMetadata: Record<string, ParameterMetadata>;
  operationParameterMapping: Record<string, string[]>;
  allPossibleParameters: string[];
  
  // Utility functions
  isParameterApplicable: (paramKey: string, operationType?: string) => boolean;
  getParameterDisplayName: (paramKey: string) => string;
  
  // Status
  isLoading: boolean;
  error: Error | null;
}

const ParameterContext = createContext<ParameterContextType>({
  // Default values from local definitions
  parameterMetadata: ALL_PARAMETER_METADATA,
  operationParameterMapping: OPERATION_PARAMETER_MAPPING,
  allPossibleParameters: ALL_POSSIBLE_PARAMETERS,
  
  // Default utility functions
  isParameterApplicable: baseIsParameterApplicable,
  getParameterDisplayName: (paramKey: string) => ALL_PARAMETER_METADATA[paramKey]?.displayName || paramKey,
  
  // Initial status
  isLoading: false,
  error: null
});

/**
 * Provider component that fetches and provides parameter definitions
 */
export const ParameterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Fetch parameter definitions from API
  const { data, isLoading, error } = useParameterDefinitions();
  
  // Use API data or fall back to local definitions
  const value: ParameterContextType = {
    parameterMetadata: data?.parameter_metadata || ALL_PARAMETER_METADATA,
    operationParameterMapping: data?.operation_parameter_mapping || OPERATION_PARAMETER_MAPPING,
    allPossibleParameters: data?.all_possible_parameters || ALL_POSSIBLE_PARAMETERS,
    
    // Utility function that uses the current definitions
    isParameterApplicable: (paramKey: string, operationType?: string) => {
      // Use the current definitions for the check
      
      // If no operation type, only basic parameters apply
      if (!operationType) {
        return value.parameterMetadata[paramKey]?.applicableToAllNodes || false;
      }
      
      // Check if the parameter is in the list for this operation type
      const applicableParams = value.operationParameterMapping[operationType] || [];
      return applicableParams.includes(paramKey);
    },
    
    // Utility function to get parameter display name
    getParameterDisplayName: (paramKey: string) => {
      return value.parameterMetadata[paramKey]?.displayName || paramKey;
    },
    
    isLoading,
    error: error as Error | null
  };
  
  return (
    <ParameterContext.Provider value={value}>
      {children}
    </ParameterContext.Provider>
  );
};

/**
 * Hook to use parameter definitions and utilities
 */
export const useParameters = () => useContext(ParameterContext); 