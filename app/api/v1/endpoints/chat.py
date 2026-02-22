"""
Chat endpoints for conversational interaction with the agent.
"""

from fastapi import APIRouter, HTTPException, Query
from app.models.chat import ChatRequest, ChatResponse, ChatMessage
from app.services.agent_service import agent_service
from datetime import datetime
from typing import List

router = APIRouter()


@router.post(
    "/message",
    response_model=ChatResponse,
    summary="Send Chat Message",
    description="Send a message to the agent with Redis-backed conversation memory"
)
async def send_message(request: ChatRequest):
    """
    Send a message to the agent in a conversational context.

    The agent maintains context using Redis checkpointer.
    Session ID is used to track conversations across requests.
    """
    try:
        # Invoke agent with session_id (Redis handles conversation history)
        result = await agent_service.invoke_chat(
            message=request.message,
            session_id=request.session_id  # Will be generated if None
        )

        # Create response message
        response_message = ChatMessage(
            role="assistant",
            content=result["response"],
            timestamp=datetime.now()
        )

        return ChatResponse(
            success=True,
            message=response_message,
            session_id=result["session_id"]  # Return session_id for client to store
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/history",
    summary="Get Conversation History",
    description="Retrieve conversation history for a given session ID"
)
async def get_history(session_id: str = Query(..., description="Session ID to retrieve history for")):
    """
    Retrieve conversation history from Redis for a given session.

    Returns a list of messages in the conversation.
    """
    try:
        messages = await agent_service.get_conversation_history(session_id)

        # Convert to ChatMessage objects
        chat_messages = [
            ChatMessage(
                role=msg["role"],
                content=msg["content"],
                timestamp=datetime.now() if msg["timestamp"] is None else msg["timestamp"]
            )
            for msg in messages
        ]

        return {
            "success": True,
            "messages": chat_messages,
            "session_id": session_id
        }

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
