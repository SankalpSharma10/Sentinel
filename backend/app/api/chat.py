from fastapi import APIRouter
from app.services.commander_ai import ChatRequest, ChatResponse, generate_commander_response

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
def chat_with_commander(request: ChatRequest):
    """
    Receives a natural language query from the dashboard and returns an AI-generated response.
    """
    return generate_commander_response(request)
