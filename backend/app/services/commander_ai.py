from pydantic import BaseModel
import os
import json
from groq import Groq

from app.services.analytics import analytics_service

class ChatRequest(BaseModel):
    message: str
    context: str = ""

class ChatResponse(BaseModel):
    response: str

# Use Environment Variable for security
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
client = Groq(api_key=GROQ_API_KEY)

def generate_commander_response(request: ChatRequest) -> ChatResponse:
    """
    Calls Groq's Llama-3.3-70b API, injecting live DuckDB analytics directly into the system prompt.
    """
    
    # 1. Fetch live holistic data from the database
    try:
        # Get worst congestion points
        worst_junctions = analytics_service.get_worst_junctions(limit=3)
        
        # Get active high-risk incidents (First15)
        active_incidents = analytics_service.con.execute("""
            SELECT count(*) as count, event_cause 
            FROM historical_events 
            WHERE event_type = 'unplanned' 
            GROUP BY event_cause
        """).fetchall()
        
        # Get total police violations (ParkGuard)
        total_violations = analytics_service.con.execute("""
            SELECT count(*) FROM violations
        """).fetchone()[0]

        context = {
            "first15_active_incidents_by_cause": [f"{row[0]} {row[1]}" for row in active_incidents],
            "parkguard_total_violations_recorded": total_violations,
            "chronic_congestion_junctions": worst_junctions
        }
        context_str = json.dumps(context, indent=2)
    except Exception as e:
        context_str = f"Error fetching live database analytics: {e}"
        
    # 2. Build the System Prompt
    system_prompt = f"""
You are Sentinel, an advanced AI Command Assistant overseeing the First15 (Incident Triage) and ParkGuard (Civic Monitoring) systems.
You operate a cyberpunk-themed, real-time tactical dashboard.

=== LIVE SENTINEL PLATFORM DATA ===
The following is live data fetched directly from our DuckDB analytics engine regarding both emergency incidents and civic violations:
{context_str}
============================================

Instructions:
1. You must answer the commander's queries based primarily on the LIVE DATA provided above.
2. If asked about First15 or incidents, refer to the active unplanned incidents and mention ML-driven triage and emergency dispatch.
3. If asked about ParkGuard or violations, refer to the total police violations recorded and civic infrastructure monitoring.
4. Maintain a tactical, concise, and highly intelligent persona (like JARVIS or a military AI).
5. Do NOT use markdown formatting like **bold** or bullet points, because the terminal UI renders raw text.
6. Keep your responses under 4 sentences to fit inside the dashboard terminal.
"""

    # 3. Call the Llama 3.3 70B Model via Groq
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.message}
            ],
            temperature=0.4,
            max_tokens=300
        )
        response_text = completion.choices[0].message.content
    except Exception as e:
        print(f"Groq API Error: {e}")
        response_text = f"CRITICAL ERROR: Connection to Neural Net severed. Details: {e}"
        
    return ChatResponse(response=response_text)
