from langchain.chat_models import init_chat_model
from app.agent.tools.technical_analysis import calculate_indicator
from app.agent.tools.fundamental_analysis import analyze_fundamentals
from app.agent.tools.screener import screen_stocks
from app.agent.tools.sentiment import analyze_sentiment
from app.core.config import settings
import os

os.environ["ANTHROPIC_API_KEY"] = settings.ANTHROPIC_API_KEY

model = init_chat_model(
    "claude-sonnet-4-5-20250929",
    temperature=0,
    streaming=True,
)

tools = [
    calculate_indicator,
    analyze_fundamentals,
    screen_stocks,
    analyze_sentiment,
]
