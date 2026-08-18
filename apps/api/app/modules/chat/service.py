from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from app.modules.agent.models import Agent
from app.modules.agent.repository import AgentRepository
from app.modules.chat.graph import ModelConfig, SubAgentSpec, build_agent_executor
from app.modules.conversation.message.repository import MessageRepository
from app.modules.conversation.message.schemas import MessageCreate, MessageRead
from app.modules.conversation.message.service import MessageService, message_to_read
from app.modules.conversation.models import Message
from app.modules.conversation.repository import ConversationRepository
from app.modules.model.models import Model
from app.modules.model.repository import ModelRepository
from app.modules.settings.repository import SettingsRepository

DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant."

# Fallback cuối cùng khi chưa có Model nào trong DB và AppSettings.default_model_id cũng trống
# (bootstrap an toàn — không chặn chat lần đầu chỉ vì chưa tạo Model resource).
_BOOTSTRAP_MODEL = ModelConfig(provider="ollama", model_id="qwen3.5:4b", base_url=None)


def _to_config(row: Model) -> ModelConfig:
    return ModelConfig(provider=row.provider, model_id=row.model_id, base_url=row.base_url)


def _to_langchain(row: Message) -> BaseMessage | None:
    if row.role == "system":
        return SystemMessage(content=row.content)
    if row.role == "user":
        return HumanMessage(content=row.content)
    if row.role == "assistant":
        return AIMessage(content=row.content)
    return None  # role == "tool" — chưa nạp vào history model, graph tool state riêng


class ChatService:
    """Chạy 1 turn: lưu user message, resolve agent+model (ADR-0006/0007), gọi graph, lưu."""

    def __init__(
        self,
        conversation_repo: ConversationRepository,
        agent_repo: AgentRepository,
        model_repo: ModelRepository,
        settings_repo: SettingsRepository,
        message_repo: MessageRepository,
    ) -> None:
        self.conversation_repo = conversation_repo
        self.agent_repo = agent_repo
        self.model_repo = model_repo
        self.settings_repo = settings_repo
        self.message_repo = message_repo
        self.message_service = MessageService(message_repo)

    async def _resolve_sub_agent_spec(self, agent: Agent) -> SubAgentSpec:
        model_row = await self.model_repo.get(agent.model_id)
        assert model_row is not None  # FK ràng buộc, không thể null trừ khi DB bị sửa tay
        return SubAgentSpec(
            slug=agent.slug,
            description=agent.description,
            system_prompt=agent.system_prompt,
            model=_to_config(model_row),
        )

    async def _resolve_default_model(self) -> ModelConfig:
        app_settings = await self.settings_repo.get_or_create()
        if app_settings.default_model_id is not None:
            model_row = await self.model_repo.get(app_settings.default_model_id)
            if model_row is not None:
                return _to_config(model_row)
        return _BOOTSTRAP_MODEL

    async def send(self, conversation_id: int, user_text: str) -> MessageRead:
        conversation = await self.conversation_repo.get(conversation_id)
        assert conversation is not None  # router đã get_or_404 trước khi gọi service này

        sub_agent_specs: list[SubAgentSpec] = []
        if conversation.agent_id is not None:
            agent = await self.agent_repo.get(conversation.agent_id)
            assert agent is not None  # ON DELETE SET NULL không xoá conversation, agent còn tồn tại
            model_row = await self.model_repo.get(agent.model_id)
            assert model_row is not None
            system_prompt, model = agent.system_prompt, _to_config(model_row)
            if agent.is_orchestrator:
                sub_agent_specs = [
                    await self._resolve_sub_agent_spec(sa)
                    for sa in await self.agent_repo.list_sub_agents(agent.id)
                ]
        else:
            system_prompt, model = DEFAULT_SYSTEM_PROMPT, await self._resolve_default_model()

        history_rows = await self.message_repo.list_all_by_conversation(conversation_id)
        history = [m for row in history_rows if (m := _to_langchain(row)) is not None]

        user_message = await self.message_service.append(
            conversation_id, MessageCreate(role="user", content=user_text)
        )

        executor = build_agent_executor(
            system_prompt=system_prompt, model=model, sub_agents=sub_agent_specs
        )
        result = await executor.ainvoke({"messages": [*history, HumanMessage(content=user_text)]})
        ai_message = result["messages"][-1]
        assistant_content = (
            ai_message.content if isinstance(ai_message.content, str) else str(ai_message.content)
        )

        assistant_row = await self.message_repo.create(
            conversation_id=conversation_id,
            seq=user_message.seq + 1,
            role="assistant",
            content=assistant_content,
            metadata_=None,
        )
        return message_to_read(assistant_row)
