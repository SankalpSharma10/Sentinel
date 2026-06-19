from fastapi import APIRouter
from typing import Dict, Any

router = APIRouter()

PLAYBOOKS = {
    "A": {
        "id": "A", "name": "Monitor Only",
        "color": "#22c55e", "icon": "👁",
        "description": "Low-risk incident. Station one officer for observation. No diversion needed.",
        "steps": ["Log incident in system", "Assign 1 officer to observe", "Re-assess in 15 minutes", "Close if self-resolved"]
    },
    "B": {
        "id": "B", "name": "Lane Management",
        "color": "#4A6CF7", "icon": "🚦",
        "description": "Medium impact. Manage traffic flow with cones and officer direction.",
        "steps": ["Deploy cones to affected lane", "Station 1–2 officers for flow control", "Contact nearest tow if needed", "Monitor for 20 minutes"]
    },
    "C": {
        "id": "C", "name": "Diversion Activation",
        "color": "#ffb320", "icon": "↪",
        "description": "High-risk corridor. Activate alternate route and notify signal control.",
        "steps": ["Activate pre-planned diversion at nearest junction", "Deploy 2 officers at diversion point", "Notify signal control room", "Dispatch tow truck immediately", "Re-assess every 10 minutes"]
    },
    "D": {
        "id": "D", "name": "Towing Priority Response",
        "color": "#ff7a2a", "icon": "🚛",
        "description": "Breakdown or obstruction requiring immediate tow. Time-critical.",
        "steps": ["Dispatch nearest tow truck immediately", "Station officer to prevent secondary incidents", "Clear 2 lanes minimum for tow access", "Activate partial diversion", "ETA track tow truck"]
    },
    "E": {
        "id": "E", "name": "Full Closure + Reroute",
        "color": "#ff2a2a", "icon": "🚨",
        "description": "Severe incident. Full road closure with citywide rerouting required.",
        "steps": ["Immediately close all lanes", "Activate full diversion route", "Notify traffic control room", "Deploy 4+ officers", "Alert neighbouring divisions", "Media/public advisory if >60 min"]
    },
    "F": {
        "id": "F", "name": "Drainage & Pumping Priority",
        "color": "#20b2aa", "icon": "🌊",
        "description": "Water logging detected. Prioritize drainage clearing to restore lane capacity.",
        "steps": ["Dispatch BBMP emergency pump truck", "Barricade flooded lanes to prevent vehicle stalling", "Deploy 2 officers to manage bottleneck", "Activate localized diversion if water level > 1ft", "Monitor weather forecast for next 2 hours"]
    },
    "G": {
        "id": "G", "name": "Hazard Barricading",
        "color": "#d97706", "icon": "🚧",
        "description": "Pothole or road damage. Secure the area to prevent accidents.",
        "steps": ["Deploy reflective barricades around the hazard", "Notify BBMP road maintenance desk", "Station 1 officer to direct traffic around barricades", "Do NOT request tow unless a vehicle is already stuck"]
    },
}

def recommend_playbook(risk_level: str, duration_cls: int, tow_likely: bool,
                        diversion_needed: bool, escalation_risk: bool, event_type: str) -> str:
    evt = event_type.lower()
    
    # Specialized event type overrides
    if 'water' in evt or 'logging' in evt:
        return "F"
    if 'pot hole' in evt or 'pothole' in evt or 'road condition' in evt:
        return "G"

    if escalation_risk and duration_cls == 2:
        return "E"
    if escalation_risk or (risk_level == "High" and diversion_needed):
        return "C"
    if tow_likely and duration_cls >= 1:
        return "D"
    if risk_level == "Medium" or duration_cls == 1:
        return "B"
    return "A"


from app.api.similar import get_similar_incidents

@router.get("/playbook/{incident_id}")
def get_playbook(
    incident_id: str,
    risk_level: str = "Medium",
    duration_cls: int = 1,
    tow_likely: bool = False,
    diversion_needed: bool = False,
    escalation_risk: bool = False,
    event_type: str = "",
) -> Dict[str, Any]:
    """
    Maps triage output to one of 7 response playbooks.
    Dynamically adjusts the playbook based on historical twins.
    """
    key = recommend_playbook(risk_level, duration_cls, tow_likely, diversion_needed, escalation_risk, event_type)
    
    # Deep copy so we don't modify the global template
    import copy
    playbook = copy.deepcopy(PLAYBOOKS[key])

    # Build warning notes from historical patterns
    warnings = []
    if tow_likely:
        warnings.append("⚠ Tow delay is a recurring issue — pre-alert nearest depot")
    if diversion_needed:
        warnings.append("⚠ Illegal parking has blocked diversion routes at this junction before")
    if escalation_risk:
        warnings.append("⚠ Breakdown near this junction often causes spillback to adjacent corridor")

    # Fetch Twins to inspire dynamic playbook
    try:
        twins = get_similar_incidents(incident_id)
        if twins:
            long_cases = [t for t in twins if t.get('duration_minutes', 0) > 90]
            early_successes = [t for t in twins if t.get('early_intervention') and t.get('duration_minutes', 0) <= 45]
            
            # Adjust Description
            if early_successes:
                playbook['description'] += f" Historical precedent shows early intervention here saved >40 mins."
            elif long_cases:
                playbook['description'] += f" High risk of escalation. {len(long_cases)} similar past cases took >90 mins to clear."

            # Inject dynamic steps based on twins
            if early_successes:
                action = early_successes[0].get('action_taken', 'Early intervention')
                # Smart override: Prevent towing recommendations for Water Logging or Pot Holes
                if key in ['F', 'G'] and 'Tow' in action:
                    action = "BBMP Rapid Response Unit"
                playbook['steps'].insert(0, f"⚡ PRECEDENT ACTION: Execute '{action}' immediately. Proven to resolve in <45 mins.")
            
            # Health Support / EMS for Accidents
            if 'accident' in event_type.lower():
                playbook['steps'].insert(0, "🚑 CRITICAL: Dispatch EMS / Ambulance immediately. Secure the perimeter for medical personnel.")
            
            if long_cases:
                playbook['steps'].append(f"⚠ MONITOR DOWNSTREAM: Past incident at {long_cases[0].get('junction')} caused major disruption. Prepare to activate green wave early.")

    except Exception as e:
        print(f"Error integrating twins into playbook: {e}")

    return {
        "incident_id": incident_id,
        "recommended_playbook": playbook,
        "all_playbooks": list(PLAYBOOKS.values()),
        "historical_warnings": warnings,
    }
