import pytest
from app.calcs import calc_generation

def test_calc_generation():
    assert calc_generation(1, 8) == 3.0
    assert calc_generation(1, 2) == 1.0
    assert calc_generation(2, 8) == 2.0

def test_calc_generation_invalid_input():
    with pytest.raises(ValueError):
        calc_generation(0, 1)
    with pytest.raises(ValueError):
        calc_generation(1, 0)
    with pytest.raises(ValueError):
        calc_generation(-1, 1)
    with pytest.raises(ValueError):
        calc_generation(1, -1) 