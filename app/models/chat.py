from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ChatMessage(BaseModel):
    """Single chat message"""
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: Optional[datetime] = None

class ChatRequest(BaseModel):
    """Request to send a message in chat"""
    message: str
    session_id: Optional[str] = None  # For future session management
    history: Optional[List[ChatMessage]] = []  # Previous messages

class ChatResponse(BaseModel):
    """Response from chat"""
    success: bool
    message: ChatMessage
    session_id: Optional[str] = None
    thinking: Optional[str] = None  # Extended Thinking content from Claude
