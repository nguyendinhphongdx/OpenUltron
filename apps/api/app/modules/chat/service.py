from fastapi import HTTPException, status
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.provider_adapter import ProviderConfigError
from app.modules.agent.schemas import AgentRead
from app.modules.agent.service import AgentService
from app.modules.chat.graph import (
    MAX_DELEGATION_DEPTH,
    ModelConfig,
    SubAgentSpec,
    build_agent_executor,
)
from app.modules.conversation.message.schemas import MessageCreate, MessageRead
from app.modules.conversation.message.service import MessageService
from app.modules.conversation.models import Message
from app.modules.conversation.service import ConversationService
from app.modules.model.models import Model
from app.modules.model.service import ModelService
from app.modules.settings.service import SettingsService

DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant."


def _bootstrap_model() -> ModelConfig:
    """Fallback cuối cùng khi chưa có Model nào trong DB và AppSettings.default_model_id cũng
    trống (bootstrap an toàn — không chặn chat lần đầu chỉ vì chưa tạo Model resource). Đọc
    `settings.ollama_model`/`settings.ollama_base_url` — KHÔNG hardcode tên model (bug đã xảy ra
    thật: hardcode "qwen3.5:4b" trong khi `.env`/Ollama máy thật lại có model khác đã pull, gây
    502 "Model không phản hồi được" dù Ollama đang chạy tốt)."""
    return ModelConfig(
        provider="ollama", model_id=settings.ollama_model, base_url=settings.ollama_base_url
    )


def _to_config(row: Model) -> ModelConfig:
    return ModelConfig(provider=row.provider, model_id=row.model_id, base_url=row.base_url)


def _extract_text(content: str | list) -> str:
    """`AIMessage.content` không phải luôn là `str` — model có "thinking"/tool-signature (Gemini
    2.5+, ADR-0009) trả content dạng list content-block (`[{"type": "text", "text": "..."}, ...]`,
    có thể kèm block `thinking`/`extras.signature` không phải text hiển thị). Chỉ nối các block
    `type == "text"`; bug thật đã xảy ra: str(content) in ra cả repr Python của list/dict."""
    if isinstance(content, str):
        return content
    parts = [
        block["text"]
        for block in content
        if isinstance(block, dict) and block.get("type") == "text"
    ]
    return "".join(parts) if parts else str(content)


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
        conversation_service: ConversationService,
        agent_service: AgentService,
        model_service: ModelService,
        settings_service: SettingsService,
        message_service: MessageService,
        session: AsyncSession,
    ) -> None:
        self.conversation_service = conversation_service
        self.agent_service = agent_service
        self.model_service = model_service
        self.settings_service = settings_service
        self.message_service = message_service
        self.session = session  # dùng để tra credential provider (ADR-0010) khi build chat model

    async def _resolve_sub_agent_spec(self, agent: AgentRead, *, depth: int = 0) -> SubAgentSpec:
        model_row = await self.model_service.get_or_404(agent.model_id)
        sub_agents: list[SubAgentSpec] = []
        # Đa tầng (ADR-0006 mở rộng): 1 sub-agent có is_orchestrator=true vẫn được tiếp tục gọi
        # sub-agent riêng của nó — chặn ở MAX_DELEGATION_DEPTH phòng cycle lọt qua check tạo cạnh.
        if agent.is_orchestrator and depth < MAX_DELEGATION_DEPTH:
            sub_agents = [
                await self._resolve_sub_agent_spec(sa, depth=depth + 1)
                for sa in await self.agent_service.list_sub_agents(agent.id)
            ]
        return SubAgentSpec(
            slug=agent.slug,
            description=agent.description,
            system_prompt=agent.system_prompt,
            model=_to_config(model_row),
            sub_agents=sub_agents,
        )

    async def _resolve_default_model(self) -> ModelConfig:
        app_settings = await self.settings_service.get()
        if app_settings.default_model_id is not None:
            model_row = await self.model_service.find(app_settings.default_model_id)
            if model_row is not None:
                return _to_config(model_row)
        return _bootstrap_model()

    async def resolve_context(
        self, conversation_id: int
    ) -> tuple[str, ModelConfig, list[SubAgentSpec]]:
        """(system_prompt, model, sub_agent_specs) cho 1 conversation — dùng lại được ở bất kỳ
        transport nào cần chạy agent cho conversation đó (chat text ở `send()`, hoặc voice module
        — ADR-0009 — không tự resolve lại agent/model riêng cho voice)."""
        conversation = await self.conversation_service.get_or_404(conversation_id)

        sub_agent_specs: list[SubAgentSpec] = []
        if conversation.agent_id is not None:
            # ON DELETE SET NULL không xoá conversation nên agent chắc chắn còn tồn tại;
            # vẫn dùng get_or_404 (qua AgentService) thay vì assert cho phòng thủ chắc chắn hơn.
            agent = await self.agent_service.get_or_404(conversation.agent_id)
            model_row = await self.model_service.get_or_404(agent.model_id)
            system_prompt, model = agent.system_prompt, _to_config(model_row)
            if agent.is_orchestrator:
                sub_agent_specs = [
                    await self._resolve_sub_agent_spec(sa)
                    for sa in await self.agent_service.list_sub_agents(agent.id)
                ]
        else:
            system_prompt, model = DEFAULT_SYSTEM_PROMPT, await self._resolve_default_model()
        return system_prompt, model, sub_agent_specs

    async def send(self, conversation_id: int, user_text: str) -> MessageRead:
        system_prompt, model, sub_agent_specs = await self.resolve_context(conversation_id)

        history_rows = await self.message_service.list_all(conversation_id)
        history = [m for row in history_rows if (m := _to_langchain(row)) is not None]

        await self.message_service.append(
            conversation_id, MessageCreate(role="user", content=user_text)
        )

        try:
            executor = await build_agent_executor(
                system_prompt=system_prompt,
                model=model,
                sub_agents=sub_agent_specs,
                session=self.session,
            )
            result = await executor.ainvoke(
                {"messages": [*history, HumanMessage(content=user_text)]}
            )
        except ProviderConfigError as exc:
            # Lỗi cấu hình (thiếu credential/base_url) — user có thể tự sửa ngay (thêm API key ở
            # Settings), khác lỗi tầng network/model tầng dưới nên trả 400 kèm message rõ ràng
            # thay vì 502 chung, để frontend hiện đúng nguyên nhân thay vì "Có lỗi xảy ra".
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        except Exception as exc:
            # Không catch cụ thể theo provider — lỗi có thể đến từ bất kỳ LangChain chat model nào
            # (Ollama/Gemini/OpenAI). Re-raise thành HTTPException để đi qua error envelope chuẩn
            # (app/core/errors.py) thay vì bubble thành 500 thô; session sẽ rollback cả user_message
            # vừa flush ở trên (get_session chỉ commit khi handler xong, xem app/db/session.py).
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Model không phản hồi được: {exc}",
            ) from exc
        ai_message = result["messages"][-1]
        assistant_content = _extract_text(ai_message.content)

        return await self.message_service.append(
            conversation_id, MessageCreate(role="assistant", content=assistant_content)
        )
