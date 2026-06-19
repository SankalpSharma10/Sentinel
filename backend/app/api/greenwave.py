from fastapi import APIRouter
from typing import List, Dict, Any, Tuple, Optional
import heapq

router = APIRouter()

# Bengaluru Road Network — weighted undirected graph
# Nodes: major junctions. Edges: approximate travel time in minutes.
ROAD_GRAPH: Dict[str, Dict[str, float]] = {
    "KengeriCircle":         {"RajajinagarCircle": 14, "JayanagarCircle": 18, "SatteliteBusStandJunc": 12},
    "RajajinagarCircle":     {"KengeriCircle": 14, "YeshwanthpuraCircle": 8, "MekhriCircle": 12, "JayanagarCircle": 16},
    "YeshwanthpuraCircle":   {"RajajinagarCircle": 8, "MekhriCircle": 10, "HebbalFlyover": 12},
    "MekhriCircle":          {"YeshwanthpuraCircle": 10, "RajajinagarCircle": 12, "HebbalFlyover": 8, "IndiranagrarCircle": 20},
    "HebbalFlyover":         {"MekhriCircle": 8, "YelhankaCircle": 15, "Nagawara": 12},
    "YelhankaCircle":        {"HebbalFlyover": 15, "Nagawara": 18},
    "Nagawara":              {"HebbalFlyover": 12, "YelhankaCircle": 18, "IndiranagrarCircle": 15, "KRPuramBridge": 20},
    "IndiranagrarCircle":    {"MekhriCircle": 20, "Nagawara": 15, "KormanagalaSignal": 18, "OldAirportRoad": 12, "KRPuramBridge": 15},
    "OldAirportRoad":        {"IndiranagrarCircle": 12, "MarathahalliJunc": 14, "KRPuramBridge": 10},
    "KRPuramBridge":         {"OldAirportRoad": 10, "IndiranagrarCircle": 15, "Nagawara": 20, "MarathahalliJunc": 12, "WhitefieldSignal": 18},
    "MarathahalliJunc":      {"KRPuramBridge": 12, "OldAirportRoad": 14, "WhitefieldSignal": 10, "ElectronicCity": 30},
    "WhitefieldSignal":      {"MarathahalliJunc": 10, "KRPuramBridge": 18, "ElectronicCity": 35},
    "JayanagarCircle":       {"KengeriCircle": 18, "RajajinagarCircle": 16, "BTMLayout": 10, "SatteliteBusStandJunc": 14},
    "BTMLayout":             {"JayanagarCircle": 10, "KormanagalaSignal": 8, "SilkBoardJunc": 10, "BanerghattaRoad": 12},
    "KormanagalaSignal":     {"BTMLayout": 8, "IndiranagrarCircle": 18, "SilkBoardJunc": 12},
    "SilkBoardJunc":         {"BTMLayout": 10, "KormanagalaSignal": 12, "BanerghattaRoad": 8, "ElectronicCity": 25},
    "BanerghattaRoad":       {"SilkBoardJunc": 8, "BTMLayout": 12, "ElectronicCity": 20},
    "ElectronicCity":        {"SilkBoardJunc": 25, "BanerghattaRoad": 20, "MarathahalliJunc": 30, "WhitefieldSignal": 35},
    "SatteliteBusStandJunc": {"KengeriCircle": 12, "JayanagarCircle": 14, "RajajinagarCircle": 18},
    "AyyappaTempleJunc":     {"KormanagalaSignal": 14, "BTMLayout": 16, "SilkBoardJunc": 18},
}

# Junction lat/lng for response
JUNCTION_COORDS: Dict[str, Dict[str, float]] = {
    "MekhriCircle":           {"lat": 13.0189, "lng": 77.5882},
    "AyyappaTempleJunc":      {"lat": 12.9264, "lng": 77.6203},
    "SatteliteBusStandJunc":  {"lat": 12.9562, "lng": 77.5467},
    "YeshwanthpuraCircle":    {"lat": 13.0187, "lng": 77.5592},
    "YelhankaCircle":         {"lat": 13.0976, "lng": 77.5975},
    "SilkBoardJunc":          {"lat": 12.9170, "lng": 77.6227},
    "MarathahalliJunc":       {"lat": 12.9591, "lng": 77.7006},
    "HebbalFlyover":          {"lat": 13.0354, "lng": 77.5970},
    "KRPuramBridge":          {"lat": 13.0000, "lng": 77.6948},
    "WhitefieldSignal":       {"lat": 12.9698, "lng": 77.7499},
    "BTMLayout":              {"lat": 12.9165, "lng": 77.6101},
    "KormanagalaSignal":      {"lat": 12.9340, "lng": 77.6269},
    "IndiranagrarCircle":     {"lat": 12.9784, "lng": 77.6408},
    "JayanagarCircle":        {"lat": 12.9308, "lng": 77.5832},
    "RajajinagarCircle":      {"lat": 12.9916, "lng": 77.5530},
    "Nagawara":               {"lat": 13.0430, "lng": 77.6269},
    "BanerghattaRoad":        {"lat": 12.8937, "lng": 77.5960},
    "ElectronicCity":         {"lat": 12.8458, "lng": 77.6603},
    "KengeriCircle":          {"lat": 12.9113, "lng": 77.4820},
    "OldAirportRoad":         {"lat": 12.9590, "lng": 77.6483},
    "SatteliteBusStandJunc":  {"lat": 12.9562, "lng": 77.5467},
    "AyyappaTempleJunc":      {"lat": 12.9264, "lng": 77.6203},
}

def heuristic(a: str, b: str) -> float:
    """Euclidean distance heuristic for A*"""
    ca = JUNCTION_COORDS.get(a, {"lat": 12.97, "lng": 77.59})
    cb = JUNCTION_COORDS.get(b, {"lat": 12.97, "lng": 77.59})
    return ((ca["lat"] - cb["lat"])**2 + (ca["lng"] - cb["lng"])**2) ** 0.5 * 111  # rough km

def astar(graph: Dict, start: str, goal: str) -> Optional[List[str]]:
    """A* pathfinding on the junction graph"""
    if start not in graph or goal not in graph:
        return None
    
    open_heap = [(0 + heuristic(start, goal), 0, start, [start])]
    visited = set()
    
    while open_heap:
        est_total, cost, current, path = heapq.heappop(open_heap)
        if current in visited:
            continue
        visited.add(current)
        if current == goal:
            return path
        for neighbor, weight in graph.get(current, {}).items():
            if neighbor not in visited:
                new_cost = cost + weight
                heapq.heappush(open_heap, (
                    new_cost + heuristic(neighbor, goal),
                    new_cost,
                    neighbor,
                    path + [neighbor]
                ))
    return None  # no path found


# Closest junction to each tow truck depot
DEPOT_NEAREST_JUNCTION = {
    "TT-01": "KormanagalaSignal",
    "TT-02": "IndiranagrarCircle",
    "TT-03": "YeshwanthpuraCircle",
    "TT-04": "WhitefieldSignal",
    "TT-05": "JayanagarCircle",
}

# Best guess: closest known junction to an arbitrary incident lat/lng
def nearest_junction(lat: float, lng: float) -> str:
    best, best_dist = "MekhriCircle", float("inf")
    for name, c in JUNCTION_COORDS.items():
        d = (c["lat"] - lat)**2 + (c["lng"] - lng)**2
        if d < best_dist:
            best, best_dist = name, d
    return best


@router.get("/green-wave")
def get_green_wave(
    truck_id: str = "TT-01",
    incident_lat: float = 12.9170,
    incident_lng: float = 77.6227,
) -> Dict[str, Any]:
    """
    Runs A* pathfinding from the given tow truck depot to the incident location
    and returns the optimal sequence of junctions (the Green Wave corridor).
    """
    start_junction = DEPOT_NEAREST_JUNCTION.get(truck_id, "MekhriCircle")
    goal_junction  = nearest_junction(incident_lat, incident_lng)

    path = astar(ROAD_GRAPH, start_junction, goal_junction)

    if not path:
        # fallback: direct line
        path = [start_junction, goal_junction]

    # Compute total ETA
    total_time = 0.0
    for i in range(len(path) - 1):
        total_time += ROAD_GRAPH.get(path[i], {}).get(path[i+1], 5)

    waypoints = []
    for junction in path:
        c = JUNCTION_COORDS.get(junction, {"lat": incident_lat, "lng": incident_lng})
        waypoints.append({
            "junction": junction,
            "lat": c["lat"],
            "lng": c["lng"],
        })

    return {
        "truck_id": truck_id,
        "start": start_junction,
        "goal": goal_junction,
        "path": path,
        "waypoints": waypoints,
        "eta_minutes": round(total_time, 1),
        "junctions_cleared": len(path),
    }
