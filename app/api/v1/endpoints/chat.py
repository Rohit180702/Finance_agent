"""
Chat endpoints for conversational interaction with the agent.
"""

import json
from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.models.chat import ChatRequest, ChatResponse, ChatMessage
from app.services.agent_service import agent_service

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
            session_id=result["session_id"],  # Return session_id for client to store
            thinking=result.get("thinking")  # Include Extended Thinking if available
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/stream",
    summary="Stream Chat Message (SSE)",
    description="Send a message and receive a token-by-token SSE stream"
)
async def stream_message(request: ChatRequest):
    """
    Stream the agent response via Server-Sent Events.

    Event types emitted:
      {"type":"session",    "session_id":"..."}
      {"type":"tool_start", "tool":"...", "input":{...}}
      {"type":"tool_end",   "tool":"..."}
      {"type":"token",      "content":"..."}
      {"type":"done"}
      {"type":"error",      "message":"..."}
    """
    async def event_generator():
        try:
            async for event_data in agent_service.stream_chat(
                message=request.message,
                session_id=request.session_id,
            ):
                yield f"data: {json.dumps(event_data)}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


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
