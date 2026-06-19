import numpy as np
from scipy.optimize import linear_sum_assignment
from typing import List, Dict, Any

# Mock Tow Truck Depots in Bengaluru
TOW_TRUCKS = [
    {"id": "TT-01", "location": "Koramangala Depot", "lat": 12.9279, "lon": 77.6271},
    {"id": "TT-02", "location": "Indiranagar Depot", "lat": 12.9719, "lon": 77.6412},
    {"id": "TT-03", "location": "Yeshwanthpur Depot", "lat": 13.0285, "lon": 77.5409},
    {"id": "TT-04", "location": "Whitefield Depot", "lat": 12.9698, "lon": 77.7500},
    {"id": "TT-05", "location": "Jayanagar Depot", "lat": 12.9299, "lon": 77.5824},
]

def calculate_dispatch_assignments(incidents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Auto-Dispatch Optimizer using the Hungarian Algorithm (Min-Cost Bipartite Matching).
    Assigns N tow trucks to M high-priority incidents, minimizing total expected travel cost.
    """
    if not incidents:
        return []
        
    num_trucks = len(TOW_TRUCKS)
    num_incidents = len(incidents)
    
    # We can only assign up to min(trucks, incidents)
    max_assignments = min(num_trucks, num_incidents)
    
    # Create Cost Matrix (rows = trucks, cols = incidents)
    # Cost = Euclidean distance * 1000 (proxy for travel time) - (Confidence * 100)
    cost_matrix = np.zeros((num_trucks, num_incidents))
    
    for i, truck in enumerate(TOW_TRUCKS):
        for j, incident in enumerate(incidents):
            # Calculate rough distance proxy
            dist = np.sqrt((truck['lat'] - incident['lat'])**2 + (truck['lon'] - incident['lon'])**2)
            
            # Reduce cost (prioritize) if it's a high impact event or high confidence
            priority_discount = 0
            if incident.get('prediction', {}).get('high_impact'):
                priority_discount += 0.5 # Substantial cost discount to force assignment
                
            cost_matrix[i, j] = dist - priority_discount

    # Run Hungarian Algorithm
    row_ind, col_ind = linear_sum_assignment(cost_matrix)
    
    assignments = []
    for idx in range(len(row_ind)):
        truck_idx = row_ind[idx]
        incident_idx = col_ind[idx]
        
        assignments.append({
            "truck_id": TOW_TRUCKS[truck_idx]["id"],
            "truck_location": TOW_TRUCKS[truck_idx]["location"],
            "truck_lat": TOW_TRUCKS[truck_idx]["lat"],
            "truck_lon": TOW_TRUCKS[truck_idx]["lon"],
            "incident_id": incidents[incident_idx]["id"],
            "incident_junction": incidents[incident_idx]["junction"],
            "incident_lat": incidents[incident_idx]["lat"],
            "incident_lon": incidents[incident_idx]["lon"],
            "cost_score": round(float(cost_matrix[truck_idx, incident_idx]), 2)
        })
        
    return assignments
