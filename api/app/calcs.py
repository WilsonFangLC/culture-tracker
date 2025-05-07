import math
from datetime import datetime
from typing import Optional, Tuple, Dict, Any

# ISO format used in our API
DATETIME_FORMAT = "%Y-%m-%dT%H:%M"

def calc_generation(
    seed_count: int, 
    harvest_count: int,
    parent_generation: Optional[float] = None
) -> float:
    """
    Calculate the generation number using log2(harvest/seed).
    If parent_generation is provided, adds to the parent's generation.
    
    Args:
        seed_count: Initial number of cells
        harvest_count: Final number of cells
        parent_generation: Generation number of parent passage (if exists)
        
    Returns:
        float: The cumulative generation number (population doublings, PD)
    """
    if seed_count <= 0 or harvest_count <= 0:
        raise ValueError("Seed and harvest counts must be positive")
    
    current_pd = math.log2(harvest_count / seed_count)
    return current_pd if parent_generation is None else parent_generation + current_pd

def calc_doubling_time_hours(start_time: str, harvest_time: str, pd: float) -> Optional[float]:
    """
    Calculate the doubling time in hours.
    
    Args:
        start_time: ISO format start time
        harvest_time: ISO format harvest time
        pd: Population doublings (from calc_generation)
        
    Returns:
        Optional[float]: Doubling time in hours, or None if pd <= 0
    """
    start = datetime.strptime(start_time, DATETIME_FORMAT)
    harvest = datetime.strptime(harvest_time, DATETIME_FORMAT)
    hours = (harvest - start).total_seconds() / 3600.0
    return hours / pd if pd > 0 else None

def calc_cumulative_pd(
    current_pd: Optional[float],
    parent_pd: Optional[float] = None
) -> Optional[float]:
    """
    Calculate cumulative population doublings including ancestors.
    
    Args:
        current_pd: Current passage's PD
        parent_pd: Parent's cumulative PD (None if no parent)
        
    Returns:
        Optional[float]: Total PD including ancestors, or None if current_pd is None
    """
    if current_pd is None:
        return None
    if parent_pd is None:
        return current_pd
    return current_pd + parent_pd

def calculate_measured_parameters(
    start_density: float,
    end_density: float,
    start_time: str,
    end_time: str
) -> Dict[str, Any]:
    """
    Calculate measured growth parameters from observed density changes.
    
    Args:
        start_density: Initial cell density
        end_density: Final cell density
        start_time: ISO format start time
        end_time: ISO format end time
        
    Returns:
        Dict containing measured_growth_rate, measured_doubling_time, and measured_density_limit
    """
    try:
        # Convert times to datetime objects
        start = datetime.fromisoformat(start_time)
        end = datetime.fromisoformat(end_time)
        
        # Calculate time difference in hours
        hours = (end - start).total_seconds() / 3600.0
        
        if hours <= 0:
            raise ValueError("End time must be after start time")
        
        if start_density <= 0 or end_density <= 0:
            raise ValueError("Densities must be positive")
        
        # If end density is lower than start, we can't use logistic model
        if end_density < start_density:
            # Could use exponential decay model instead, but for now return null
            return {
                "measured_growth_rate": None,
                "measured_doubling_time": None,
                "measured_density_limit": None
            }
        
        # Calculate growth rate (assumes exponential phase if end_density < 2*start_density)
        # For exponential phase: N(t) = N0 * e^(r*t)
        # So r = ln(N(t)/N0) / t
        growth_rate = math.log(end_density / start_density) / hours
        
        # Calculate doubling time (ln(2)/r)
        doubling_time = math.log(2) / growth_rate if growth_rate > 0 else None
        
        # Estimate density_limit from the data
        # In logistic model, if we assume we're in mid-phase growth,
        # we can estimate K (density limit) based on observed growth
        # Using: K = N0 * N1 * (N1 - N0) / (N1^2 - N0^2)
        # This is a very rough estimate, more data points would give better results
        
        # Simple approximation: if growth has slowed significantly, use 2x end_density as limit
        if end_density > 1.5 * start_density:
            density_limit = 2 * end_density  # Simple approximation
        else:
            # For very slow growth, this might indicate we're near carrying capacity
            density_limit = 1.2 * end_density
        
        return {
            "measured_growth_rate": round(growth_rate, 6),
            "measured_doubling_time": round(doubling_time, 2) if doubling_time else None,
            "measured_density_limit": round(density_limit, 0)
        }
        
    except (ValueError, TypeError) as e:
        print(f"Error calculating growth parameters: {str(e)}")
        return {
            "measured_growth_rate": None,
            "measured_doubling_time": None,
            "measured_density_limit": None
        } 