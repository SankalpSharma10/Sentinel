from pydantic import BaseModel
from typing import Dict, Any

class SimulationResult(BaseModel):
    event_id: str
    delta_minutes: int
    original_delay_minutes: float
    new_delay_minutes: float
    saved_delay_minutes: float
    commuter_hours_saved: float
    economic_value_saved_inr: float

def simulate_intervention(event_id: str, delta_minutes: int) -> SimulationResult:
    """
    Deterministic Queuing Theory Model (Counterfactual Time Machine)
    
    Formula:
    Q(t) = integral(lambda_in - mu_out) dt
    
    For the hackathon, we use a simplified deterministic area-under-curve triangle model:
    Delay = 0.5 * (Arrival Rate - Incident Departure Rate) * (Duration^2)
    """
    
    # In a real app, these would be fetched from the DB based on event_id.
    # We use hardcoded hackathon values for the demo.
    arrival_rate = 120.0  # cars per minute
    normal_departure_rate = 150.0 # cars per minute
    incident_departure_rate = 40.0 # cars per minute (bottleneck)
    
    # Original duration of incident (e.g., how long it actually took to clear)
    actual_duration_mins = 45.0
    
    # If the user asks to intervene delta_minutes EARLIER (e.g. -10 mins), 
    # the new duration is actual_duration_mins - abs(delta_minutes)
    intervention_shift = abs(delta_minutes)
    
    if intervention_shift >= actual_duration_mins:
        new_duration_mins = 0.0 # Instant clear
    else:
        new_duration_mins = actual_duration_mins - intervention_shift

    # Queue accumulation rate
    accumulation_rate = arrival_rate - incident_departure_rate
    
    if accumulation_rate <= 0:
        # No queue builds up
        return SimulationResult(
            event_id=event_id,
            delta_minutes=delta_minutes,
            original_delay_minutes=0,
            new_delay_minutes=0,
            saved_delay_minutes=0,
            commuter_hours_saved=0,
            economic_value_saved_inr=0
        )

    # Calculate Total Delay (Vehicle-Minutes) as Area of Triangle
    original_delay = 0.5 * accumulation_rate * (actual_duration_mins ** 2)
    new_delay = 0.5 * accumulation_rate * (new_duration_mins ** 2)
    saved_delay = original_delay - new_delay
    
    # Convert to business value (Assuming 1.5 commuters per car, and 5 INR per minute value of time)
    commuter_hours = (saved_delay * 1.5) / 60.0
    economic_value = saved_delay * 1.5 * 5.0
    
    return SimulationResult(
        event_id=event_id,
        delta_minutes=delta_minutes,
        original_delay_minutes=round(original_delay, 2),
        new_delay_minutes=round(new_delay, 2),
        saved_delay_minutes=round(saved_delay, 2),
        commuter_hours_saved=round(commuter_hours, 2),
        economic_value_saved_inr=round(economic_value, 2)
    )
