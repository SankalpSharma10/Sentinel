from fastapi import APIRouter
from typing import List, Dict, Any
import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime

from app.services.analytics import analytics_service

router = APIRouter()

# Load Models
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ml_pipeline/models"))
IMPACT_MODEL_PATH = os.path.join(BASE_DIR, 'high_impact_model.pkl')
DURATION_MODEL_PATH = os.path.join(BASE_DIR, 'duration_model.pkl')

try:
    impact_model = joblib.load(IMPACT_MODEL_PATH)
    duration_model = joblib.load(DURATION_MODEL_PATH)
    print("XGBoost Models Loaded Successfully")
except Exception as e:
    print(f"Warning: Could not load XGBoost models: {e}")
    impact_model = None
    duration_model = None

@router.get("/events/active")
def get_active_events(live: bool = False):
    """
    Queries real incidents from DuckDB and runs them through the XGBoost ML Models.
    """
    try:
        # Fetch 15 "unplanned" events to simulate the live feed
        # If live=true, use random sorting to continuously shift incidents
        order_clause = "ORDER BY random()" if live else ""
        query = f"""
            SELECT 
                id, 
                COALESCE(junction, police_station, 'Unknown Junction') as junction,
                latitude, 
                longitude, 
                event_cause as type,
                start_datetime
            FROM historical_events
            WHERE event_type = 'unplanned'
            AND latitude IS NOT NULL 
            AND longitude IS NOT NULL
            {order_clause}
            LIMIT 15
        """
        result = analytics_service.con.execute(query)
        columns = [desc[0] for desc in result.description]
        rows = result.fetchall()
        
        live_events = []
        for row in rows:
            event_data = dict(zip(columns, row))
            
            # 1. Feature Engineering for ML
            dt = pd.to_datetime(event_data.get('start_datetime', datetime.now()))
            hour = dt.hour
            day_of_week = dt.dayofweek
            is_peak_hour = 1 if (8 <= hour <= 11) or (17 <= hour <= 20) else 0
            
            features = pd.DataFrame([{
                'latitude': float(event_data['latitude']),
                'longitude': float(event_data['longitude']),
                'hour': hour,
                'day_of_week': day_of_week,
                'is_peak_hour': is_peak_hour
            }])
            
            # 2. XGBoost Inference
            high_impact = False
            duration_class = "Medium"
            confidence = 0.85
            
            if impact_model and duration_model:
                try:
                    impact_pred = impact_model.predict(features)[0]
                    duration_pred = duration_model.predict(features)[0]
                    # Softprob allows getting confidence
                    impact_proba = impact_model.predict_proba(features)[0]
                    
                    high_impact = bool(impact_pred)
                    # Maps encoded duration class back to string (0: Short, 1: Medium, 2: Long)
                    class_map = {0: "Short", 1: "Medium", 2: "Long"}
                    duration_class = class_map.get(int(duration_pred), "Medium")
                    confidence = float(max(impact_proba))
                except Exception as e:
                    print(f"Inference error: {e}")
                    pass
            
            live_events.append({
                "id": str(event_data['id']),
                "junction": str(event_data['junction']),
                "lat": float(event_data['latitude']),
                "lon": float(event_data['longitude']),
                "type": str(event_data['type']).replace('_', ' ').title(),
                "prediction": {
                    "high_impact": high_impact,
                    "duration_class": duration_class,
                    "tow_truck_needed": "breakdown" in str(event_data['type']).lower(),
                    "confidence": round(confidence, 2)
                }
            })
            
        # 3. Cascade Graph Prediction
        high_impact_events = [e for e in live_events if e["prediction"]["high_impact"]]
        active_junctions = [e["junction"] for e in high_impact_events if e["junction"] != "Unknown Junction"]
        cascade_zones = analytics_service.get_cascade_predictions(active_junctions, limit=len(high_impact_events))
        
        # Center the cascade risk zones precisely on the high-impact events
        for i, zone in enumerate(cascade_zones):
            if i < len(high_impact_events):
                zone["lat"] = high_impact_events[i]["lat"]
                zone["lon"] = high_impact_events[i]["lon"]
            else:
                zone["lat"] = 12.9716
                zone["lon"] = 77.5946
            
        # 4. Auto-Dispatch Optimizer (Hungarian Algorithm)
        from app.services.dispatch import calculate_dispatch_assignments
        high_priority_incidents = [e for e in live_events if e["prediction"]["high_impact"]]
        dispatch_assignments = calculate_dispatch_assignments(high_priority_incidents)
            
        return {
            "live_events": live_events,
            "cascade_zones": cascade_zones,
            "dispatch_assignments": dispatch_assignments
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error fetching active events: {e}")
        return {
            "live_events": [],
            "cascade_zones": [],
            "dispatch_assignments": []
        }
