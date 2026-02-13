from langchain.chat_models import init_chat_model
from app.agent.tools.technical_analysis import calculate_indicator
from app.core.config import settings
import os

# Ensure API key is set in environment
os.environ["ANTHROPIC_API_KEY"] = settings.ANTHROPIC_API_KEY

model = init_chat_model(
    "claude-sonnet-4-5-20250929",
    temperature=0
)

tools = [calculate_indicator]
