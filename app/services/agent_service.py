from typing import Dict, Any, List
from app.agent.graph import create_agent


class AgentService:
    """Service for interacting with the LangGraph agent"""

    def __init__(self):
        self.agent = create_agent()

    async def invoke_chat(self, message: str, history: List[Dict[str, str]] = None) -> str:
        """
        Invoke the agent with a message and conversation history.

        Args:
            message: User's current message
            history: List of previous messages [{"role": "user", "content": "..."}, ...]

        Returns:
            Agent's response as a string
        """
        try:
            # Build messages list from history
            messages = []

            # Add previous messages from history
            if history:
                for msg in history:
                    role = "user" if msg["role"] == "user" else "assistant"
                    messages.append((role, msg["content"]))

            # Add current user message
            messages.append(("user", message))

            # Invoke the agent with full conversation
            result = self.agent.invoke({"messages": messages})

            # Extract the last message from the agent
            result_messages = result.get("messages", [])
            if result_messages:
                last_message = result_messages[-1]
                # Handle different message formats
                if hasattr(last_message, "content"):
                    return last_message.content
                elif isinstance(last_message, tuple):
                    return last_message[1]
                else:
                    return str(last_message)

            return "No response from agent"

        except Exception as e:
            raise Exception(f"Agent invocation failed: {str(e)}")

    # Keep the old method for backward compatibility
    async def invoke(self, message: str) -> str:
        """Legacy method - calls invoke_chat with no history"""
        return await self.invoke_chat(message, history=None)


# Create singleton instance
agent_service = AgentService()
