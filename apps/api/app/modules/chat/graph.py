from dataclasses import dataclass

from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt import create_react_agent

from app.core.providers import build_chat_model


@dataclass
class ModelConfig:
    """DTO thuần — tách graph khỏi ORM `Model` (ADR-0007)."""

    provider: str
    model_id: str
    base_url: str | None = None


@dataclass
class SubAgentSpec:
    """DTO thuần — tách graph khỏi ORM `Agent` (ADR-0007)."""

    slug: str
    description: str | None
    system_prompt: str
    model: ModelConfig


def _build_sub_agent_tool(sub_agent: SubAgentSpec):
    """Bọc 1 sub-agent thành LangGraph tool cho orchestrator gọi (ADR-0006).

    Bản đầu: sub-agent KHÔNG được gọi tiếp sub-agent khác (1 tầng, tránh cycle).
    """

    @tool(
        sub_agent.slug, description=sub_agent.description or f"Delegate task to '{sub_agent.slug}'"
    )
    async def _delegate(task: str) -> str:
        chat_model = build_chat_model(
            provider=sub_agent.model.provider,
            model_id=sub_agent.model.model_id,
            base_url=sub_agent.model.base_url,
        )
        executor = create_react_agent(chat_model, tools=[], prompt=sub_agent.system_prompt)
        result = await executor.ainvoke({"messages": [HumanMessage(content=task)]})
        return str(result["messages"][-1].content)

    return _delegate


def build_agent_executor(
    *, system_prompt: str, model: ModelConfig, sub_agents: list[SubAgentSpec]
) -> CompiledStateGraph:
    """Graph cho 1 turn — orchestrator có thêm tool gọi sub-agent (ADR-0006)."""
    chat_model = build_chat_model(
        provider=model.provider, model_id=model.model_id, base_url=model.base_url
    )
    tools = [_build_sub_agent_tool(sa) for sa in sub_agents]
    return create_react_agent(chat_model, tools=tools, prompt=system_prompt)
