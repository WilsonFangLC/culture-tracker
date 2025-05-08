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
  initialDensity: number | null | undefined,
  finalDensity: number | null | undefined,
  startTime: string | Date | null | undefined,
  endTime: string | Date | null | undefined
): number | null => {
  // Validate essential inputs
  if (
    initialDensity == null ||
    finalDensity == null ||
    startTime == null ||
    endTime == null ||
    initialDensity <= 0 || // Initial density must be positive
    finalDensity <= 0 // Final density must be positive
  ) {
    return null; // Cannot calculate
  }

  try {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // Calculate time elapsed in hours
    const timeElapsedHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

    if (timeElapsedHours <= 0) {
      console.log('Measured Doubling Time Calc: End time is not after start time.');
      return null; // Cannot calculate if end time is before or equal to start time
    }

    // For non-growing cultures (final density <= initial density)
    if (finalDensity <= initialDensity) {
      console.log('Measured Doubling Time Calc: No growth or negative growth detected.');
      return null; // No doubling time for non-growing cultures
    }

    // Calculate growth rate from exponential growth model
    // N = N₀ * e^(r*t) => log(N/N₀) = r*t => r = log(N/N₀)/t
    const growthRate = Math.log(finalDensity / initialDensity) / timeElapsedHours;

    // Calculate doubling time
    // doubling_time = ln(2)/r
    const doublingTime = Math.log(2) / growthRate;

    console.log(`Measured Doubling Time Calc: initialDensity=${initialDensity}, finalDensity=${finalDensity}, timeElapsedHours=${timeElapsedHours.toFixed(2)}, growthRate=${growthRate.toFixed(6)}, doublingTime=${doublingTime.toFixed(2)}`);

    return doublingTime;

  } catch (error) {
    console.error("Error calculating measured doubling time:", error);
    return null; // Return null on any calculation error
  }
}; 