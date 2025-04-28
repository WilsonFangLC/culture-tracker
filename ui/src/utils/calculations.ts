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