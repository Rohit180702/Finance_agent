from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.redis import RedisSaver
from app.llm.claude import model, tools
from app.core.redis_client import get_redis_checkpointer_client

def call_model(state: MessagesState):

  # Bind tools to the model so it knows what tools it has
  model_with_tools = model.bind_tools(tools)

  response = model_with_tools.invoke(state["messages"])
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
