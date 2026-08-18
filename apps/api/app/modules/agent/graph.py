from functools import lru_cache

from langchain_ollama import ChatOllama
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.core.config import settings
from app.modules.agent.state import ChatState


@lru_cache(maxsize=1)
def get_model() -> ChatOllama:
    return ChatOllama(base_url=settings.ollama_base_url, model=settings.ollama_model)


async def call_model(state: ChatState) -> dict:
    """Node duy nhất bản đầu — gọi LLM với toàn bộ history, chưa có tool (ADR-0005)."""
    response = await get_model().ainvoke(state["messages"])
    return {"messages": [response]}


@lru_cache(maxsize=1)
def build_chat_graph() -> CompiledStateGraph:
    """Graph chat đơn giản: START -> call_model -> END. Chưa tool, chưa approval-gate."""
    graph = StateGraph(ChatState)
    graph.add_node("call_model", call_model)
    graph.add_edge(START, "call_model")
    graph.add_edge("call_model", END)
    return graph.compile()
