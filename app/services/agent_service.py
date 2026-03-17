from typing import Dict, Any, List, AsyncGenerator
from app.agent.graph import create_agent
import uuid
import json
import traceback


class AgentService:
    """Service for interacting with the LangGraph agent"""

    def __init__(self):
        self.agent = create_agent()

    async def get_conversation_history(self, session_id: str) -> List[Dict[str, Any]]:
        """
        Retrieve conversation history for a given session from Redis.

        Args:
            session_id: Session ID to retrieve history for

        Returns:
            List of message dictionaries with 'role', 'content', and 'timestamp'
        """
        try:
            if not session_id:
                return []

            # Configure with the session's thread_id
            config = {"configurable": {"thread_id": session_id}}

            # Debug: Print full traceback on error
            import traceback
            try:
                # Get the current state from the checkpointer (async checkpointer requires aget_state)
                state = await self.agent.aget_state(config)
            except Exception as e:
                print(f"Error in get_state: {e}")
                print(f"Full traceback:")
                traceback.print_exc()
                raise

            # Extract messages from state
            messages_list = []
            if state and state.values and "messages" in state.values:
                raw_messages = state.values["messages"]

                for msg in raw_messages:
                    # Handle different message formats
                    if hasattr(msg, "type") and hasattr(msg, "content"):
                        # LangChain message object
                        role = "user" if msg.type == "human" else "assistant"
                        content = msg.content
                    elif isinstance(msg, tuple) and len(msg) >= 2:
                        # Tuple format (role, content)
                        role = "user" if msg[0] == "user" else "assistant"
                        content = msg[1]
                    else:
                        continue

                    messages_list.append({
                        "role": role,
                        "content": content,
                        "timestamp": None  # Redis doesn't store timestamps by default
                    })

            return messages_list

        except Exception as e:
            # If there's an error retrieving history, return empty list
            # This allows the conversation to continue even if history retrieval fails
            print(f"Error retrieving conversation history: {str(e)}")
            return []

    async def invoke_chat(self, message: str, session_id: str = None) -> Dict[str, Any]:
        """
        Invoke the agent with a message using Redis-backed conversation memory.

        Args:
            message: User's current message
            session_id: Session ID for conversation persistence (generated if not provided)

        Returns:
            Dict with 'response' and 'session_id'
        """
        try:
            # Generate session_id if not provided
            if not session_id:
                session_id = str(uuid.uuid4())

            # Configure the agent with thread_id for persistence
            config = {"configurable": {"thread_id": session_id}}

            # Debug: Check checkpointer
            if hasattr(self.agent, 'checkpointer') and self.agent.checkpointer:
                if hasattr(self.agent.checkpointer, 'redis_client'):
                    print(f"DEBUG: Checkpointer redis_client = {self.agent.checkpointer.redis_client}")
                else:
                    print(f"DEBUG: Checkpointer has no redis_client attribute")
            else:
                print(f"DEBUG: Agent has no checkpointer!")

            # Invoke the agent with just the current message
            # Async checkpointer requires ainvoke
            result = await self.agent.ainvoke(
                {"messages": [("user", message)]},
                config=config
            )

            # Extract the last message from the agent
            result_messages = result.get("messages", [])
            if result_messages:
                last_message = result_messages[-1]

                # Parse Extended Thinking content blocks
                thinking_content = None
                text_content = None

                # Handle different message formats
                if hasattr(last_message, "content"):
                    content = last_message.content

                    # Check if content is a list of blocks (Extended Thinking format)
                    if isinstance(content, list):
                        for block in content:
                            if isinstance(block, dict):
                                if block.get("type") == "thinking":
                                    thinking_content = block.get("thinking", "")
                                elif block.get("type") == "text":
                                    text_content = block.get("text", "")
                            # Handle LangChain's content block objects
                            elif hasattr(block, "type"):
                                if block.type == "thinking":
                                    thinking_content = getattr(block, "thinking", "")
                                elif block.type == "text":
                                    text_content = getattr(block, "text", "")

                        # If we found text content, use it; otherwise use the whole content
                        response = text_content if text_content else str(content)
                    else:
                        # Simple string content (no Extended Thinking)
                        response = content

                elif isinstance(last_message, tuple):
                    response = last_message[1]
                else:
                    response = str(last_message)
            else:
                response = "No response from agent"

            return {
                "response": response,
                "thinking": thinking_content,  # Include thinking if available
                "session_id": session_id
            }

        except Exception as e:
            traceback.print_exc()
            raise Exception(f"Agent invocation failed: {type(e).__name__}: {str(e)}")

    async def stream_chat(
        self, message: str, session_id: str = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream chat response token-by-token using LangGraph astream_events.

        Yields dicts with keys:
          {"type": "session",    "session_id": str}
          {"type": "tool_start", "tool": str, "input": dict}
          {"type": "tool_end",   "tool": str}
          {"type": "token",      "content": str}
          {"type": "done"}
          {"type": "error",      "message": str}
        """
        if not session_id:
            session_id = str(uuid.uuid4())

        config = {"configurable": {"thread_id": session_id}}

        yield {"type": "session", "session_id": session_id}

        try:
            async for event in self.agent.astream_events(
                {"messages": [("user", message)]},
                config=config,
                version="v2",
            ):
                kind = event["event"]

                if kind == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    content = chunk.content

                    if isinstance(content, str) and content:
                        yield {"type": "token", "content": content}

                    elif isinstance(content, list):
                        for block in content:
                            text = ""
                            if isinstance(block, dict) and block.get("type") == "text":
                                text = block.get("text", "")
                            elif hasattr(block, "type") and block.type == "text":
                                text = getattr(block, "text", "")
                            if text:
                                yield {"type": "token", "content": text}

                elif kind == "on_tool_start":
                    yield {
                        "type": "tool_start",
                        "tool": event.get("name", ""),
                        "input": event["data"].get("input", {}),
                    }

                elif kind == "on_tool_end":
                    yield {"type": "tool_end", "tool": event.get("name", "")}

        except Exception as exc:
            yield {"type": "error", "message": str(exc)}
            return

        yield {"type": "done"}

    # Keep the old method for backward compatibility
    async def invoke(self, message: str) -> str:
        """Legacy method - calls invoke_chat with no session_id"""
        result = await self.invoke_chat(message, session_id=None)
        return result["response"]


# Create singleton instance
agent_service = AgentService()
