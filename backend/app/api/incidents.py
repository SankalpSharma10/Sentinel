from fastapi import APIRouter
from typing import List, Dict, Any
import os, joblib, pandas as pd, re
from datetime import datetime
from app.services.analytics import analytics_service
from app.api.triage import resolve_incident_type

router = APIRouter()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ml_pipeline/models"))
try:
    impact_model = joblib.load(os.path.join(BASE_DIR, 'high_impact_model.pkl'))
    duration_model = joblib.load(os.path.join(BASE_DIR, 'duration_model.pkl'))
except:
    impact_model = None
    duration_model = None

RISK_LABELS = {0: "Low", 1: "Medium", 2: "High"}
DURATION_LABELS = {0: "< 30 min", 1: "30 - 90 min", 2: "> 90 min"}

def run_models(lat, lng, start_datetime):
    dt = pd.to_datetime(start_datetime, errors='coerce') if start_datetime else datetime.now()
    if pd.isnull(dt): dt = datetime.now()
    hour = dt.hour
    dow = dt.dayofweek
    is_peak = 1 if (8 <= hour <= 11) or (17 <= hour <= 20) else 0
    features = pd.DataFrame([{'latitude': float(lat), 'longitude': float(lng),
                               'hour': hour, 'day_of_week': dow, 'is_peak_hour': is_peak}])
    impact, duration_cls, confidence = False, 1, 0.72
    if impact_model:
        try:
            impact = bool(impact_model.predict(features)[0])
            proba = impact_model.predict_proba(features)[0]
            confidence = float(max(proba))
        except: pass
    if duration_model:
        try: duration_cls = int(duration_model.predict(features)[0])
        except: pass

    # Synchronized with triage.py logic
    risk_level = "High" if impact else ("Medium" if is_peak or duration_cls >= 1 else "Low")
    risk_score = round(confidence * 100)
    
    # If the score is exactly 50% or above, and it's marked High in Triage, ensure consistency
    if risk_score >= 50 and impact:
        risk_level = "High"

    return {
        "impact": impact, "risk_level": risk_level, "risk_score": risk_score,
        "duration_bucket": DURATION_LABELS.get(duration_cls, "30 - 90 min"),
        "duration_cls": duration_cls,
        "tow_likely": impact and duration_cls >= 1,
        "is_peak": bool(is_peak), "hour": hour
    }

@router.get("/incidents")
def get_incidents(demo: bool = False) -> List[Dict[str, Any]]:
    """Returns all incidents with pre-computed risk level for map plotting."""
    try:
        if demo:
            # Return 12 robust incidents (4 initial + 8 pop-ups)
            # We filter for accidents, breakdowns, water logging with long descriptions
            # This guarantees rich Playbook and Triage data.
            where_clause = "latitude IS NOT NULL AND longitude IS NOT NULL AND length(description) > 10 AND event_cause IN ('accident', 'vehicle_breakdown', 'water_logging')"
            limit_clause = "ORDER BY random() LIMIT 12"
        else:
            where_clause = "latitude IS NOT NULL AND longitude IS NOT NULL AND event_type = 'unplanned'"
            limit_clause = "ORDER BY random() LIMIT 40"

        rows = analytics_service.con.execute(f"""
            SELECT id,
                   COALESCE(NULLIF(junction, 'NULL'), NULLIF(police_station, 'NULL'), 'Geo-Point (' || ROUND(latitude, 4) || ', ' || ROUND(longitude, 4) || ')') as junction,
                   latitude, longitude, event_cause as type,
                   event_type, start_datetime,
                   COALESCE(NULLIF(description, 'NULL'), '') as description
            FROM historical_events
            WHERE {where_clause}
            {limit_clause}
        """).fetchall()
        cols = ['id','junction','lat','lng','type','event_type','start_datetime','description']
        results = []
        for row in rows:
            d = dict(zip(cols, row))
            m = run_models(d['lat'], d['lng'], d['start_datetime'])
            
            # Clean up junction name one more time in python just in case
            junc_name = str(d['junction']).strip()
            if junc_name == 'NULL' or not junc_name:
                junc_name = f"Geo-Point ({float(d['lat']):.4f}, {float(d['lng']):.4f})"
                
            results.append({
                "id": str(d['id']),
                "junction": junc_name,
                "lat": float(d['lat']),
                "lng": float(d['lng']),
                "type": resolve_incident_type(d['type'], d.get('description', '')),
                "risk_level": m['risk_level'],
                "risk_score": m['risk_score'],
                "tow_likely": m['tow_likely'],
                "duration_bucket": m['duration_bucket'],
                "is_peak": m['is_peak'],
            })
        return results
    except Exception as e:
        print(f"incidents error: {e}")
        return []
