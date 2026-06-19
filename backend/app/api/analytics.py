from fastapi import APIRouter
from typing import List, Dict, Any
from app.services.analytics import analytics_service

router = APIRouter()

@router.get("/pain-points", response_model=List[Dict[str, Any]])
def get_chronic_pain_points():
    """
    Returns the top worst junctions based on historical delay aggregations via DuckDB.
    """
    return analytics_service.get_worst_junctions(limit=5)
