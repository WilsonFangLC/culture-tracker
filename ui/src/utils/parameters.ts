// Type definitions for operation types
export type OperationType = 'start_new_culture' | 'passage' | 'freeze' | 'thaw' | 'measurement' | 'split' | 'harvest';

// Define which parameters apply to which operation types
export const OPERATION_PARAMETER_MAPPING: Record<OperationType, string[]> = {
  start_new_culture: ['temperature_c', 'volume_ml', 'location', 'cell_density', 'viability', 'growth_rate', 'doubling_time', 'density_limit', 'cell_type', 'operation_type'],
  passage: ['temperature_c', 'volume_ml', 'location', 'cell_density', 'viability', 'growth_rate', 'doubling_time', 'density_limit', 'parent_end_density', 'cell_type', 'operation_type'],
  freeze: ['temperature_c', 'volume_ml', 'location', 'cell_density', 'viability', 'growth_rate', 'doubling_time', 'density_limit', 'storage_location', 'parent_end_density', 'number_of_vials', 'total_cells', 'cell_type', 'operation_type'],
  thaw: ['temperature_c', 'volume_ml', 'location', 'cell_density', 'viability', 'growth_rate', 'doubling_time', 'density_limit', 'number_of_passages', 'cell_type', 'operation_type'],
  measurement: ['temperature_c', 'volume_ml', 'location', 'cell_density', 'viability', 'growth_rate', 'doubling_time', 'density_limit', 'measured_value', 'cell_type', 'operation_type'],
  split: ['temperature_c', 'volume_ml', 'location', 'cell_density', 'viability', 'growth_rate', 'doubling_time', 'density_limit', 'parent_end_density', 'cell_type', 'operation_type'],
  harvest: ['temperature_c', 'volume_ml', 'location', 'viability', 'end_density', 'cell_type', 'operation_type'],
};

// Define all possible parameters with metadata
export const ALL_PARAMETER_METADATA: Record<string, { 
  displayName: string; 
  applicableToAllNodes: boolean;
  operationSpecific?: OperationType[];
}> = {
  // Basic parameters that can apply to all nodes
  "temperature_c": { displayName: "Temperature (°C)", applicableToAllNodes: true },
  "volume_ml": { displayName: "Volume (ml)", applicableToAllNodes: true },
  "location": { displayName: "Location", applicableToAllNodes: true },
  "cell_density": { displayName: "Initial Cell Density", applicableToAllNodes: true },
  "viability": { displayName: "Viability (%)", applicableToAllNodes: true },
  "growth_rate": { displayName: "Growth Rate", applicableToAllNodes: true },
  "doubling_time": { displayName: "Doubling Time", applicableToAllNodes: true },
  "density_limit": { displayName: "Density Limit", applicableToAllNodes: true },
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
  "operation_type": { displayName: "Operation Type", applicableToAllNodes: true },
};

// Get all possible parameter keys
export const ALL_POSSIBLE_PARAMETERS = Object.keys(ALL_PARAMETER_METADATA); 