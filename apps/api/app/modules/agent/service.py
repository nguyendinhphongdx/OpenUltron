from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from app.modules.agent.graph import build_chat_graph
from app.modules.conversation.message.repository import MessageRepository
from app.modules.conversation.message.schemas import MessageCreate, MessageRead
from app.modules.conversation.message.service import MessageService, message_to_read
from app.modules.conversation.models import Message


def _to_langchain(row: Message) -> BaseMessage | None:
    if row.role == "system":
        return SystemMessage(content=row.content)
    if row.role == "user":
        return HumanMessage(content=row.content)
    if row.role == "assistant":
        return AIMessage(content=row.content)
    return None  # role == "tool" — chưa xử lý, graph chưa có tool (ADR-0005)


class AgentService:
    """Chạy graph LangGraph cho 1 turn: lưu user message, gọi model, lưu assistant message."""

    def __init__(self, message_repo: MessageRepository) -> None:
        self.message_repo = message_repo
        self.message_service = MessageService(message_repo)

    async def send(self, conversation_id: int, user_text: str) -> MessageRead:
        history_rows = await self.message_repo.list_all_by_conversation(conversation_id)
        history = [m for row in history_rows if (m := _to_langchain(row)) is not None]

        user_message = await self.message_service.append(
            conversation_id, MessageCreate(role="user", content=user_text)
        )

        graph = build_chat_graph()
        result = await graph.ainvoke({"messages": [*history, HumanMessage(content=user_text)]})
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
