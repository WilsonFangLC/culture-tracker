import math
from datetime import datetime
from typing import Optional

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