from langchain.chat_models import init_chat_model
from agent.tools.technical_analysis import calculate_indicator

model = init_chat_model(
    "claude-sonnet-4-5-20250929",
    temperature=0
)

tools = [calculate_indicator]
