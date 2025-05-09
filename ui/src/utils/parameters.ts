// Type definitions for operation types
export type OperationType = 'start_new_culture' | 'passage' | 'freeze' | 'thaw' | 'measurement' | 'split' | 'harvest';

// Parameter metadata interface
export interface ParameterMetadata {
  displayName: string;
  applicableToAllNodes: boolean;
  operationSpecific?: OperationType[];
}

// Define which parameters apply to which operation types
export const OPERATION_PARAMETER_MAPPING: Record<OperationType, string[]> = {
  start_new_culture: ['temperature_c', 'volume_ml', 'location', 'cell_density', 'start_viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'cell_type', 'operation_type'],
  passage: ['temperature_c', 'volume_ml', 'location', 'cell_density', 'start_viability', 'parent_end_viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'parent_end_density', 'cell_type', 'example_parameter', 'operation_type'],
  freeze: ['temperature_c', 'volume_ml', 'location', 'cell_density', 'parent_end_viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'storage_location', 'parent_end_density', 'number_of_vials', 'total_cells', 'cell_type', 'operation_type'],
  thaw: ['temperature_c', 'volume_ml', 'location', 'cell_density', 'start_viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'number_of_passages', 'cell_type', 'operation_type'],
  measurement: ['temperature_c', 'volume_ml', 'location', 'cell_density', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'measured_value', 'cell_type', 'operation_type'],
  split: ['temperature_c', 'volume_ml', 'location', 'cell_density', 'parent_end_viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'parent_end_density', 'cell_type', 'operation_type'],
  harvest: ['temperature_c', 'volume_ml', 'location', 'parent_end_viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_doubling_time', 'end_density', 'cell_type', 'example_parameter', 'operation_type'],
};

// Define all possible parameters with metadata
export const ALL_PARAMETER_METADATA: Record<string, ParameterMetadata> = {
  // Basic parameters that can apply to all nodes
  "temperature_c": { displayName: "Temperature (°C)", applicableToAllNodes: true },
  "volume_ml": { displayName: "Volume (ml)", applicableToAllNodes: true },
  "location": { displayName: "Location", applicableToAllNodes: true },
  "cell_density": { displayName: "Initial Cell Density", applicableToAllNodes: true },
  // Replaced viability with two more specific parameters
  "start_viability": { displayName: "Start Viability (%)", applicableToAllNodes: false, operationSpecific: ['start_new_culture', 'passage', 'thaw'] },
  "parent_end_viability": { displayName: "Parent End Viability (%)", applicableToAllNodes: false, operationSpecific: ['passage', 'harvest', 'freeze', 'split'] },
  "growth_rate": { displayName: "Hypothesized Growth Rate", applicableToAllNodes: true },
  "doubling_time": { displayName: "Hypothesized Doubling Time", applicableToAllNodes: true },
  "density_limit": { displayName: "Hypothesized Density Limit", applicableToAllNodes: true },
  "measured_doubling_time": { displayName: "Measured Doubling Time", applicableToAllNodes: true },
  "storage_location": { displayName: "Storage Location", applicableToAllNodes: false, operationSpecific: ['freeze'] },
  
  // Operation-specific parameters
  "cell_type": { displayName: "Cell Type", applicableToAllNodes: true, operationSpecific: ['start_new_culture'] },
  "parent_end_density": { displayName: "Parent End Density", applicableToAllNodes: false, operationSpecific: ['passage', 'freeze', 'split'] },
  "number_of_vials": { displayName: "Number of Vials", applicableToAllNodes: false, operationSpecific: ['freeze'] },
  "total_cells": { displayName: "Total Cells", applicableToAllNodes: false, operationSpecific: ['freeze'] },
  "number_of_passages": { displayName: "Number of Passages", applicableToAllNodes: false, operationSpecific: ['thaw'] },
  "end_density": { displayName: "End Density", applicableToAllNodes: false, operationSpecific: ['harvest'] },
  "measured_value": { displayName: "Measured Value", applicableToAllNodes: false, operationSpecific: ['measurement'] },
  
  // Former transition parameters, now regular parameters
  "example_parameter": { displayName: "Example Parameter", applicableToAllNodes: false, operationSpecific: ['passage', 'harvest'] },
  "operation_type": { displayName: "Operation Type", applicableToAllNodes: true },
};

// Get all possible parameter keys
export const ALL_POSSIBLE_PARAMETERS = Object.keys(ALL_PARAMETER_METADATA);

/**
 * Determines if a parameter is applicable to a specific operation type.
 * 
 * @param paramKey The parameter key to check
 * @param operationType The operation type, or undefined if not specified
 * @returns True if the parameter is applicable, false otherwise
 */
export function isParameterApplicable(paramKey: string, operationType?: string): boolean {
  // If no operation type, only basic parameters apply
  if (!operationType) {
    return ALL_PARAMETER_METADATA[paramKey]?.applicableToAllNodes || false;
  }
  
  // Check if the parameter is in the list for this operation type
  if (operationType in OPERATION_PARAMETER_MAPPING) {
    const typedOperation = operationType as OperationType;
    const applicableParams = OPERATION_PARAMETER_MAPPING[typedOperation] || [];
    return applicableParams.includes(paramKey);
  }
  
  return false;
}

/**
 * Interface for parameter definitions returned from the API
 */
export interface ParameterDefinitions {
  operation_parameter_mapping: Record<string, string[]>;
  parameter_metadata: Record<string, ParameterMetadata>;
  all_possible_parameters: string[];
}

/**
 * Fetches parameter definitions from the API.
 * Falls back to default values if fetch fails.
 */
export async function fetchParameterDefinitions(): Promise<ParameterDefinitions> {
  try {
    const response = await fetch('/api/parameters/definitions');
    if (!response.ok) {
      throw new Error(`Error fetching parameter definitions: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch parameter definitions, using defaults:', error);
    return {
      operation_parameter_mapping: OPERATION_PARAMETER_MAPPING,
      parameter_metadata: ALL_PARAMETER_METADATA,
      all_possible_parameters: ALL_POSSIBLE_PARAMETERS
    };
  }
} 