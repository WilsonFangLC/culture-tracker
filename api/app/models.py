from datetime import datetime, timezone
from typing import Optional, Dict, List
import math  # Import math for log calculation
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, JSON
from pydantic import model_validator, ValidationError  # Import validator


class CellState(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(default="")
    # Use default DateTime column type for SQLite, keep Python type hint
    timestamp: datetime = Field()
    parent_id: Optional[int] = Field(default=None, foreign_key="cellstate.id")
    parameters: Dict = Field(default_factory=dict, sa_column=Column(JSON))
    notes: Optional[str] = Field(default=None)
    transition_type: Optional[str] = Field(default=None)
    additional_notes: Optional[str] = Field(default=None)
    # Remove created_by field
    # created_by: str = Field(index=True)
    
    # Relationships
    parent: Optional["CellState"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": "CellState.id"}
    )
    children: List["CellState"] = Relationship(back_populates="parent")

    @model_validator(mode='before')
    @classmethod
    def calculate_growth_parameters(cls, values):
        params = values.get('parameters', {})
        if not isinstance(params, dict):
            # Or handle error appropriately
            return values

        growth_rate = params.get('growth_rate')
        doubling_time = params.get('doubling_time')

        try:
            # Convert to float if possible
            if growth_rate is not None:
                growth_rate = float(growth_rate)
            if doubling_time is not None:
                doubling_time = float(doubling_time)

            if growth_rate is not None and growth_rate > 0 and doubling_time is None:
                params['doubling_time'] = math.log(2) / growth_rate
            elif doubling_time is not None and doubling_time > 0 and growth_rate is None:
                params['growth_rate'] = math.log(2) / doubling_time
            elif growth_rate is not None and doubling_time is not None:
                # Check for consistency, allowing for small floating point differences
                expected_doubling_time = math.log(2) / growth_rate if growth_rate > 0 else float('inf')
                if not math.isclose(doubling_time, expected_doubling_time, rel_tol=1e-6):
                     # Prioritize growth_rate if both are provided and inconsistent
                     params['doubling_time'] = expected_doubling_time
                     # Alternatively, raise ValidationError:
                     # raise ValueError("Provided growth_rate and doubling_time are inconsistent.")

        except (ValueError, TypeError):
            # Handle cases where conversion to float fails or non-numeric types are present
            # Option 1: Keep original values and maybe log a warning
            pass
            # Option 2: Raise a validation error
            # raise ValueError("growth_rate and doubling_time must be numeric.")

        values['parameters'] = params
        return values


# Pydantic models for request/response validation
# class StateTransitionBase(SQLModel): ...
# class StateTransitionCreate(StateTransitionBase): ...
# class StateTransitionUpdate(SQLModel): ...
# class StateTransitionRead(StateTransitionBase): ... 