from dotenv import load_dotenv

load_dotenv()
from langchain.tools import tool
from agent.graph import create_agent

def main():
    print("Finance Agent Started")
    print("Ask me about stocks")
    print("Type 'quit/q/exit' to exit\n")

    agent = create_agent()

    while True:
      user_input = input("You: ").strip()

      if user_input.lower() in ["quit", "q", "exit"]:
        print("Finance Agent Stopped")
        break

      if not user_input:
        continue

      result = agent.invoke({"messages": [("user", user_input)]})

      #Get the last message from the result
      response = result["messages"][-1].content

      print(f"Agent: {response}")

if __name__ == "__main__":
    main()
