"""
Chat endpoints for conversational interaction with the agent.
"""

from fastapi import APIRouter, HTTPException
from app.models.chat import ChatRequest, ChatResponse, ChatMessage
from app.services.agent_service import agent_service
from datetime import datetime

router = APIRouter()


@router.post(
    "/message",
    response_model=ChatResponse,
    summary="Send Chat Message",
    description="Send a message to the agent with conversation history"
)
async def send_message(request: ChatRequest):
    """
    Send a message to the agent in a conversational context.

    The agent maintains context from previous messages in the conversation.
    """
    try:
        # Convert ChatMessage objects to dict format for agent
        history = []
        if request.history:
            history = [
                {"role": msg.role, "content": msg.content}
                for msg in request.history
            ]

        # Invoke agent with history
        response_content = await agent_service.invoke_chat(
            message=request.message,
            history=history
        )

        # Create response message
        response_message = ChatMessage(
            role="assistant",
            content=response_content,
            timestamp=datetime.now()
        )

        return ChatResponse(
            success=True,
            message=response_message,
            session_id=request.session_id
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/clear",
    summary="Clear Chat History",
    description="Clear the conversation history (client-side only for now)"
)
async def clear_chat():
    """
    Clear chat history.
    Currently this is a no-op as history is managed client-side.
    """
    return {"success": True, "message": "Chat history cleared"}
