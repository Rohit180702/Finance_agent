from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.redis import RedisSaver
from langchain_core.messages import SystemMessage
from app.llm.claude import model, tools
from app.core.redis_client import get_redis_checkpointer_client

SYSTEM_PROMPT = """You are a specialized Finance Assistant focused exclusively on financial markets, stock analysis, and investment insights.

**Your Expertise:**
- Technical Analysis (indicators like RSI, MACD, Moving Averages, Bollinger Bands, etc.)
- Fundamental Analysis (financial ratios, balance sheets, cash flow, P&L statements)
- Stock market trends and insights
- Company financials and valuation metrics
- Investment strategies and portfolio analysis
- Economic indicators and market structure

**Strict Guidelines:**
1. ONLY respond to finance, stock market, and investment-related queries
2. If a user asks about non-finance topics (e.g., general knowledge, coding, recipes, travel, etc.), politely decline and redirect them to finance topics
3. Use your tools to fetch real-time stock data and perform analysis
4. Provide data-driven insights based on actual market data
5. Be professional, accurate, and concise in your responses

**Response Format for Non-Finance Queries:**
If asked about non-finance topics, respond with:
"I'm a specialized Finance Assistant designed to help with stock analysis, technical indicators, fundamental analysis, and market insights. I cannot assist with [topic]. Please ask me about stocks, financial markets, or investment analysis instead!"

**Example Finance Queries You Should Answer:**
- "Show me the RSI trend for RELIANCE"
- "What are the fundamental ratios for TCS?"
- "Compare MACD signals for INFY and WIPRO"
- "Analyze the cash flow for HDFCBANK"

Stay focused on finance. Be helpful, accurate, and professional."""

def call_model(state: MessagesState):
  # Add system prompt if not already present
  messages = state["messages"]

  # Check if first message is a system message
  if not messages or not isinstance(messages[0], SystemMessage):
    messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages

  # Bind tools to the model so it knows what tools it has
  model_with_tools = model.bind_tools(tools)

  response = model_with_tools.invoke(messages)
  return {"messages": [response]}

def create_agent():
  graph = StateGraph(MessagesState)

  graph.add_node("agent", call_model)
  graph.add_node("tools", ToolNode(tools))

  graph.add_edge(START, "agent")
  graph.add_conditional_edges("agent", tools_condition)
  graph.add_edge("tools", "agent")

  # Add Redis checkpointer for conversation memory
  # Use Redis client with decode_responses=False (RedisSaver needs bytes)
  redis_client = get_redis_checkpointer_client()
  checkpointer = RedisSaver(redis_client=redis_client)

  return graph.compile(checkpointer=checkpointer)
