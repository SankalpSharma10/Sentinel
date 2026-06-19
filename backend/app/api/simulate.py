from fastapi import APIRouter
from pydantic import BaseModel
from app.ml.simulation import simulate_intervention, SimulationResult

router = APIRouter()

class SimulationRequest(BaseModel):
    event_id: str
    delta_minutes: int

@router.post("/simulate", response_model=SimulationResult)
def run_simulation(request: SimulationRequest):
    """
    Triggers the Counterfactual Time Machine.
    Expects an event_id and the delta (e.g., -10 means intervention 10 minutes earlier).
    """
    return simulate_intervention(
        event_id=request.event_id,
        delta_minutes=request.delta_minutes
    )
