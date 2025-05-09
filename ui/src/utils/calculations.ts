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
      console.log('Predicted Density Calc: Start time is in the future. Returning initial density.');
      return initialDensity; // If current time is before start time, return initial density
    }

    // Log the calculated time elapsed
    console.log(`Predicted Density Calc: startTime=${startDate.toISOString()}, currentTime=${now.toISOString()}, timeElapsedHours=${timeElapsedHours.toFixed(2)}`);

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

/**
 * Calculates the measured doubling time based on actual growth data.
 * Uses the exponential growth model: N = N₀ * e^(r*t)
 * Doubling time = ln(2)/r
 * 
 * @param initialDensity The initial cell density
 * @param finalDensity The final cell density
 * @param startTime The timestamp when the initial density was recorded
 * @param endTime The timestamp when the final density was recorded
 * @returns The calculated doubling time in hours, or null if calculation is not possible
 */
export const calculateMeasuredDoublingTime = (
  initialDensity: number | string | null | undefined,
  finalDensity: number | string | null | undefined,
  startTime: string | Date | null | undefined,
  endTime: string | Date | null | undefined
): number | null => {
  console.log(`calculateMeasuredDoublingTime called with:
    - initialDensity: ${initialDensity} (type: ${typeof initialDensity})
    - finalDensity: ${finalDensity} (type: ${typeof finalDensity})
    - startTime: ${startTime} (type: ${typeof startTime})
    - endTime: ${endTime} (type: ${typeof endTime})
  `);

  // Convert potential string values to numbers
  const initialDensityNum = initialDensity !== null && initialDensity !== undefined ? Number(initialDensity) : null;
  const finalDensityNum = finalDensity !== null && finalDensity !== undefined ? Number(finalDensity) : null;

  // Validate essential inputs
  if (initialDensityNum === null || isNaN(initialDensityNum)) {
    console.log('Measured Doubling Time Calc: initialDensity is null, undefined or not a number');
    return null;
  }
  if (finalDensityNum === null || isNaN(finalDensityNum)) {
    console.log('Measured Doubling Time Calc: finalDensity is null, undefined or not a number');
    return null;
  }
  if (startTime == null) {
    console.log('Measured Doubling Time Calc: startTime is null or undefined');
    return null;
  }
  if (endTime == null) {
    console.log('Measured Doubling Time Calc: endTime is null or undefined');
    return null;
  }
  if (initialDensityNum <= 0) {
    console.log(`Measured Doubling Time Calc: initialDensity must be positive, got ${initialDensityNum}`);
    return null;
  }
  if (finalDensityNum <= 0) {
    console.log(`Measured Doubling Time Calc: finalDensity must be positive, got ${finalDensityNum}`);
    return null;
  }

  try {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    
    console.log(`Parsed dates:
      - startDate: ${startDate.toISOString()}
      - endDate: ${endDate.toISOString()}
    `);

    // Calculate time elapsed in hours
    const timeElapsedHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    console.log(`Calculated timeElapsedHours: ${timeElapsedHours.toFixed(2)}`);

    if (timeElapsedHours <= 0) {
      console.log('Measured Doubling Time Calc: End time is not after start time.');
      return null; // Cannot calculate if end time is before or equal to start time
    }

    // For non-growing cultures (final density <= initial density)
    if (finalDensityNum <= initialDensityNum) {
      console.log('Measured Doubling Time Calc: No growth or negative growth detected.');
      return null; // No doubling time for non-growing cultures
    }

    // Calculate growth rate from exponential growth model
    // N = N₀ * e^(r*t) => log(N/N₀) = r*t => r = log(N/N₀)/t
    const growthRate = Math.log(finalDensityNum / initialDensityNum) / timeElapsedHours;
    console.log(`Calculated growthRate: ${growthRate.toFixed(6)}`);

    // Calculate doubling time
    // doubling_time = ln(2)/r
    const doublingTime = Math.log(2) / growthRate;
    console.log(`Calculated doublingTime: ${doublingTime.toFixed(2)}`);

    console.log(`Measured Doubling Time Calc: initialDensity=${initialDensityNum}, finalDensity=${finalDensityNum}, timeElapsedHours=${timeElapsedHours.toFixed(2)}, growthRate=${growthRate.toFixed(6)}, doublingTime=${doublingTime.toFixed(2)}`);

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