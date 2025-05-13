// Debounce helper function 
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const debounce = <T extends (...args: any[]) => any>(
  func: T, 
  delay: number
): ((...args: Parameters<T>) => Promise<ReturnType<T> | null>) => {
  return (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
    return new Promise(resolve => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = setTimeout(() => {
        resolve(func(...args));
      }, delay);
    });
  };
};

/**
 * Calculates the predicted cell density using the logistic growth model.
 *
 * N(t) = K / (1 + ((K - N₀) / N₀) * e^(-r * t))
 *
 * @param initialDensity (N₀) The cell density at the start time.
 * @param growthRate (r) The intrinsic growth rate (units should match time units, e.g., per hour).
 * @param densityLimit (K) The carrying capacity or maximum density.
 * @param startTime The timestamp (ISO string or Date object) when the initialDensity was recorded.
 * @returns The predicted cell density at the current time, or null if calculation is not possible.
 */
export const calculatePredictedDensity = (
  initialDensity: number | null | undefined,
  growthRate: number | null | undefined,
  densityLimit: number | null | undefined,
  startTime: string | Date | null | undefined
): number | null => {
  // Validate essential inputs
  if (
    initialDensity == null ||
    growthRate == null ||
    densityLimit == null ||
    startTime == null ||
    initialDensity <= 0 || // Initial density must be positive
    growthRate <= 0 || // Growth rate must be positive for growth
    densityLimit <= 0 || // Density limit must be positive
    initialDensity >= densityLimit // If already at or above limit, no further growth
  ) {
    return null; // Cannot calculate or no growth expected
  }

  try {
    const startDate = new Date(startTime);
    const now = new Date();

    // Calculate time elapsed in hours (assuming growthRate is per hour)
    // Adjust unit if growthRate has a different unit
    const timeElapsedHours = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60);

    if (timeElapsedHours < 0) {
      return initialDensity; // If current time is before start time, return initial density
    }

    // Logistic growth formula parts
    const K = densityLimit;
    const N0 = initialDensity;
    const r = growthRate;
    const t = timeElapsedHours;

    const factor = ((K - N0) / N0) * Math.exp(-r * t);
    const predictedDensity = K / (1 + factor);

    // Return the calculated density, capped at the density limit
    return Math.min(predictedDensity, K);

  } catch (error) {
    console.error("Error calculating predicted density:", error);
    return null; // Return null on any calculation error (e.g., invalid date)
  }
};

// Debounced version of calculatePredictedDensity that prevents excessive calculations
export const debouncedCalculatePredictedDensity = debounce(calculatePredictedDensity, 300);

/**
 * Calculates the measured doubling time based on actual growth data.
 * Uses the exponential growth model: N = N₀ * e^(r*t)
 * Doubling time = ln(2)/r
 * 
 * This function has two signatures:
 * 1. Four parameters: initial/final density and start/end time for two different states
 * 2. Two parameters: state with both initial and end density, plus a timestamp
 * 
 * @param initialDensity The initial cell density or state containing both densities
 * @param finalDensity The final cell density or null if using the single state method
 * @param startTime The timestamp when the initial density was recorded
 * @param endTime The timestamp when the final density was recorded or null if using the single state method
 * @returns The calculated doubling time in hours, or null if calculation is not possible
 */
export const calculateMeasuredDoublingTime = (
  initialDensity: number | string | null | undefined | { 
    parameters?: { 
      cell_density?: number;
      end_density?: number;
    }; 
    timestamp?: string 
  },
  finalDensity?: number | string | null | undefined | { 
    parameters?: { 
      transition_parameters?: { 
        parent_end_density?: number 
      } 
    };
    timestamp?: string 
  },
  startTime?: string | Date | null | undefined,
  endTime?: string | Date | null | undefined
): number | null => {
  // Check if this is using the "single state" signature where the first argument is a state object
  // with both initial and end density
  if (initialDensity !== null && 
      initialDensity !== undefined && 
      typeof initialDensity === 'object' && 
      'parameters' in initialDensity) {
    const state = initialDensity;
    
    // Check if we have the required data in the state
    if (!state.parameters?.cell_density) {
      return null;
    }
    
    // Look for end density either directly in parameters or in a child node
    let endDensityValue = null;
    
    // First try to find it directly in the state
    if (state.parameters.end_density) {
      endDensityValue = state.parameters.end_density;
    } 
    // Otherwise check for transition_parameters.parent_end_density in a child
    else if (finalDensity && 
        typeof finalDensity === 'object' && 
        'parameters' in finalDensity &&
        finalDensity.parameters?.transition_parameters?.parent_end_density) {
      endDensityValue = finalDensity.parameters.transition_parameters.parent_end_density;
    }
    
    // If we couldn't find an end density, we can't calculate
    if (!endDensityValue) {
      return null;
    }
    
    // Get the timestamp from the state
    if (!state.timestamp) {
      return null;
    }
    
    // For end time, use either the provided end time or the child's timestamp
    let endTimeValue = null;
    if (endTime) {
      endTimeValue = endTime;
    } else if (typeof startTime === 'string' || startTime instanceof Date) {
      endTimeValue = startTime;
    } else if (finalDensity && 
        typeof finalDensity === 'object' && 
        'timestamp' in finalDensity &&
        finalDensity.timestamp) {
      endTimeValue = finalDensity.timestamp;
    }
    
    if (!endTimeValue) {
      return null;
    }
    
    // Call recursive with the extracted values
    return calculateMeasuredDoublingTime(
      state.parameters.cell_density, 
      endDensityValue,
      state.timestamp,
      endTimeValue
    );
  }
  
  // Original implementation for the four parameter signature
  // Convert potential string values to numbers
  let initialDensityNum: number | null = null;
  let finalDensityNum: number | null = null;
  
  try {
    // Handle different data types for initial density
    if (initialDensity !== null && initialDensity !== undefined) {
      initialDensityNum = typeof initialDensity === 'string' 
        ? parseFloat(initialDensity) 
        : (typeof initialDensity === 'number' ? initialDensity : null);
    }
    
    // Handle different data types for final density
    if (finalDensity !== null && finalDensity !== undefined) {
      finalDensityNum = typeof finalDensity === 'string' 
        ? parseFloat(finalDensity) 
        : (typeof finalDensity === 'number' ? finalDensity : null);
    }
  } catch (error) {
    console.error("Error parsing density values:", error);
    return null;
  }

  // Validate essential inputs
  if (initialDensityNum === null || isNaN(initialDensityNum)) {
    return null;
  }
  if (finalDensityNum === null || isNaN(finalDensityNum)) {
    return null;
  }
  if (startTime == null) {
    return null;
  }
  if (endTime == null) {
    return null;
  }
  if (initialDensityNum <= 0) {
    return null;
  }
  if (finalDensityNum <= 0) {
    return null;
  }

  try {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    
    // Validate date parsing
    if (isNaN(startDate.getTime())) {
      console.error(`Invalid start date format: ${startTime}`);
      return null;
    }
    
    if (isNaN(endDate.getTime())) {
      console.error(`Invalid end date format: ${endTime}`);
      return null;
    }

    // Calculate time elapsed in hours
    const timeElapsedHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

    if (timeElapsedHours <= 0) {
      return null; // Cannot calculate if end time is before or equal to start time
    }

    // For non-growing cultures (final density <= initial density)
    if (finalDensityNum <= initialDensityNum) {
      return null; // No doubling time for non-growing cultures
    }

    // Calculate growth rate from exponential growth model
    // N = N₀ * e^(r*t) => log(N/N₀) = r*t => r = log(N/N₀)/t
    const growthRate = Math.log(finalDensityNum / initialDensityNum) / timeElapsedHours;

    // Calculate doubling time
    // doubling_time = ln(2)/r
    const doublingTime = Math.log(2) / growthRate;

    return doublingTime;

  } catch (error) {
    console.error("Error calculating measured doubling time:", error);
    return null; // Return null on any calculation error
  }
};

/**
 * Formats a number to 3 significant figures. This provides consistent formatting
 * across the application.
 * 
 * @param value The number to format
 * @param defaultValue Value to return if the input is null, undefined, or not a number
 * @returns A string representation of the number with 3 significant figures
 */
export const formatToSignificantFigures = (
  value: number | null | undefined,
  defaultValue: string = 'N/A'
): string => {
  if (value === null || value === undefined || !isFinite(value)) {
    return defaultValue;
  }
  
  // Handle 0 separately
  if (value === 0) {
    return '0';
  }
  
  // Format to 3 significant figures
  return value.toPrecision(3);
};

/**
 * Formats cell density values by converting to millions and using 3 significant figures.
 * 
 * @param value Cell density in absolute number
 * @param defaultValue Value to return if the input is null, undefined, or not a number
 * @returns Formatted string with cell density in millions
 */
export const formatCellDensity = (
  value: number | null | undefined,
  defaultValue: string = 'N/A'
): string => {
  if (value === null || value === undefined || !isFinite(value)) {
    return defaultValue;
  }
  
  // Convert to millions
  const valueInMillions = value / 1000000;
  
  // Format to 3 significant figures
  return formatToSignificantFigures(valueInMillions);
}; 