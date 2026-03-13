from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_core.messages import SystemMessage
from app.llm.claude import model, tools

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
    messages = state["messages"]
    if not messages or not isinstance(messages[0], SystemMessage):
        messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages
    model_with_tools = model.bind_tools(tools)
    response = model_with_tools.invoke(messages)
    return {"messages": [response]}


def _get_checkpointer():
    """
    Return the best available checkpointer.
    Priority: Postgres (set by main.py at startup) → Redis fallback
    """
    # Postgres checkpointer — set by main.py lifespan, no circular import
    from app.core.checkpointer import get_checkpointer
    cp = get_checkpointer()
    if cp is not None:
        return cp

    # Redis fallback (cold start before lifespan has run, or standalone tests)
    try:
        from langgraph.checkpoint.redis import RedisSaver
        from app.core.redis_client import get_redis_checkpointer_client
        redis_client = get_redis_checkpointer_client()
        redis_client.ping()
        cp = RedisSaver(redis_client=redis_client)
        cp.setup()
        print("✅ Agent graph compiled with Redis checkpointer (fallback)")
        return cp
    except Exception as e:
        print(f"❌ No checkpointer available: {e}")
        return None


def create_agent():
    graph = StateGraph(MessagesState)
    graph.add_node("agent", call_model)
    graph.add_node("tools", ToolNode(tools))
    graph.add_edge(START, "agent")
    graph.add_conditional_edges("agent", tools_condition)
    graph.add_edge("tools", "agent")

    checkpointer = _get_checkpointer()
    if checkpointer:
        print("✅ Agent graph compiled with checkpointer")
        return graph.compile(checkpointer=checkpointer)

    raise RuntimeError("No checkpointer available. Ensure Postgres or Redis is running.")
