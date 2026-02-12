from typing import Dict, Any
from app.agent.graph import create_agent


class AgentService:
    """Service for interacting with the LangGraph agent"""

    def __init__(self):
        self.agent = create_agent()

    async def invoke(self, message: str) -> str:
        """
        Invoke the agent with a message and return the response.

        Args:
            message: User's message/query

        Returns:
            Agent's response as a string
        """
        try:
            # Invoke the agent
            result = self.agent.invoke({"messages": [("user", message)]})

            # Extract the last message from the agent
            messages = result.get("messages", [])
            if messages:
                last_message = messages[-1]
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

