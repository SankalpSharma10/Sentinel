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
    Calls Groq's Llama-3.1-70b API, injecting live DuckDB analytics directly into the system prompt.
    """
    
    # 1. Fetch live traffic anomalies from the database
    try:
        worst_junctions = analytics_service.get_worst_junctions(limit=5)
        context_str = json.dumps(worst_junctions, indent=2)
    except Exception as e:
        context_str = f"Error fetching live database analytics: {e}"
        
    # 2. Build the System Prompt
    system_prompt = f"""
You are Sentinel, an advanced AI Command Assistant for the Bengaluru Traffic Police.
You operate a cyberpunk-themed, real-time tactical dashboard.

=== LIVE CITY DATA (CHRONIC PAIN POINTS) ===
The following is live data fetched directly from our DuckDB analytics engine regarding the most severe junctions right now:
{context_str}
============================================

Instructions:
1. You must answer the commander's (user's) queries based primarily on the LIVE CITY DATA provided above.
2. If asked where to deploy resources, tow trucks, or police officers, recommend the junctions with the highest 'total_delay_minutes' or 'incident_count'.
3. Maintain a tactical, concise, and highly intelligent persona (like JARVIS or a military AI).
4. Do NOT use markdown formatting like **bold** or bullet points, because the terminal UI renders raw text.
5. Keep your responses under 4 sentences to fit inside the dashboard terminal.
"""

    # 3. Call the Llama 3.3 70B Model via Groq (3.1 was decommissioned)
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
