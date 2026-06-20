from fastapi import APIRouter
from typing import List, Dict, Any
from app.services.analytics import analytics_service

router = APIRouter()

# Severity thresholds based on research findings
SEVERE_THRESHOLD = 5000
MODERATE_THRESHOLD = 2000


@router.get("/penalty-zones")
def get_penalty_zones() -> Dict[str, Any]:
    """
    Static Chokepoint Heatmap.
    Aggregates police violation data into a 1km grid (2 decimal places).
    Zones with extreme parking violation density are flagged as chokepoints
    that can trap emergency vehicles and sabotage response times.
    """
    try:
        # Aggregate violations into 1km grid cells
        query = """
            SELECT
                ROUND(latitude, 2) as grid_lat,
                ROUND(longitude, 2) as grid_lng,
                COUNT(*) as total_violations,
                COUNT(*) FILTER (WHERE violation_type ILIKE '%parking%') as parking_violations,
                COUNT(*) FILTER (WHERE violation_type ILIKE '%main road%') as main_road_violations,
                COUNT(*) FILTER (WHERE violation_type ILIKE '%footpath%') as footpath_violations
            FROM violations
            WHERE latitude IS NOT NULL
            AND longitude IS NOT NULL
            AND latitude BETWEEN 12.8 AND 13.2
            AND longitude BETWEEN 77.4 AND 77.8
            GROUP BY 1, 2
            HAVING COUNT(*) >= 500
            ORDER BY total_violations DESC
            LIMIT 25
        """
        rows = analytics_service.con.execute(query).fetchall()
        cols = ['grid_lat', 'grid_lng', 'total_violations', 'parking_violations',
                'main_road_violations', 'footpath_violations']

        zones = []
        for row in rows:
            d = dict(zip(cols, row))
            total = int(d['total_violations'])
            parking = int(d['parking_violations'])

            if total >= SEVERE_THRESHOLD:
                severity = "SEVERE"
                color = "#ff2a2a"
                radius = min(total / 200, 800)  # max 800m radius circle
            elif total >= MODERATE_THRESHOLD:
                severity = "MODERATE"
                color = "#ffb320"
                radius = min(total / 200, 600)
            else:
                severity = "LOW"
                color = "#f59e0b"
                radius = min(total / 200, 400)

            # Human-readable impact description
            if severity == "SEVERE":
                impact = f"Extreme congestion zone. {total:,} violations detected. Emergency vehicles may lose 8–15 min."
            elif severity == "MODERATE":
                impact = f"High congestion zone. {total:,} violations detected. Emergency vehicles may lose 4–8 min."
            else:
                impact = f"Moderate congestion zone. {total:,} violations detected."

            zones.append({
                "lat": float(d['grid_lat']),
                "lng": float(d['grid_lng']),
                "total_violations": total,
                "parking_violations": parking,
                "main_road_violations": int(d['main_road_violations']),
                "severity": severity,
                "color": color,
                "radius_meters": radius,
                "impact_description": impact,
            })

        severe_count = sum(1 for z in zones if z['severity'] == 'SEVERE')
        moderate_count = sum(1 for z in zones if z['severity'] == 'MODERATE')

        return {
            "zones": zones,
            "total_zones": len(zones),
            "severe_count": severe_count,
            "moderate_count": moderate_count,
            "worst_zone": zones[0] if zones else None,
        }

    except Exception as e:
        print(f"Penalty zones error: {e}")
        return {"zones": [], "total_zones": 0, "severe_count": 0, "moderate_count": 0, "error": str(e)}


@router.get("/penalty-zones/check")
def check_chokepoint(lat: float, lng: float) -> Dict[str, Any]:
    """
    Check if a specific lat/lng is inside or adjacent to a penalty zone.
    Used by triage endpoint to add chokepoint_warning to incident responses.
    """
    try:
        grid_lat = round(lat, 2)
        grid_lng = round(lng, 2)

        # Check within 1km (same grid cell or adjacent)
        query = f"""
            SELECT
                ROUND(latitude, 2) as grid_lat,
                ROUND(longitude, 2) as grid_lng,
                COUNT(*) as violations
            FROM violations
            WHERE ROUND(latitude, 2) BETWEEN {grid_lat - 0.01} AND {grid_lat + 0.01}
            AND ROUND(longitude, 2) BETWEEN {grid_lng - 0.01} AND {grid_lng + 0.01}
            GROUP BY 1, 2
            ORDER BY violations DESC
            LIMIT 1
        """
        row = analytics_service.con.execute(query).fetchone()

        if row and row[2] >= MODERATE_THRESHOLD:
            violations = int(row[2])
            severity = "SEVERE" if violations >= SEVERE_THRESHOLD else "MODERATE"
            return {
                "is_chokepoint": True,
                "violations_nearby": violations,
                "severity": severity,
                "warning": f"⚠️ This incident is in a Static Chokepoint zone with {violations:,} recorded parking violations. Emergency vehicles may face significant delays.",
            }

        return {"is_chokepoint": False, "violations_nearby": 0, "severity": "NONE", "warning": None}

    except Exception as e:
        print(f"Chokepoint check error: {e}")
        return {"is_chokepoint": False, "violations_nearby": 0, "severity": "NONE", "warning": None}
