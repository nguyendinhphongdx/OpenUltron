"""`AgentReadinessService` — KHÔNG đặt tên `service.py` có chủ đích: đây không phải CRUD 1 entity
sở hữu bởi module `agent` (không có `models.py`/`repository.py` riêng cho readiness) mà là 1
class **compose nhiều service của module khác** (`AgentService`, `ModelService`,
`CredentialService`, `ToolService`, `KnowledgeBaseService`) để trả 1 kết quả tổng hợp — cùng lý do
`ChatService` (`app/modules/chat/service.py`) compose nhiều service, và giống cách
`voice/contracts.py` tự giải thích ngoại lệ tên file khác chuẩn ở
`docs/conventions/01-backend-fastapi.md` (bảng "Ngoại lệ đã biết"). Đặt trong `app/modules/agent/`
(không phải module riêng) vì đọc là chính agent + agent org-chart (đệ quy `AgentDelegation`).
"""

from __future__ import annotations

from app.core.provider_adapter import CREDENTIAL_PROVIDERS
from app.modules.agent.schemas import AgentNodeReadiness, AgentReadinessRead
from app.modules.agent.service import AgentService
from app.modules.credential.service import CredentialService
from app.modules.knowledge_base.service import KnowledgeBaseService
from app.modules.model.service import ModelService
from app.modules.tool.service import ToolService, config_issue_for_kind


class AgentReadinessService:
    def __init__(
        self,
        agent_service: AgentService,
        model_service: ModelService,
        credential_service: CredentialService,
        tool_service: ToolService,
        kb_service: KnowledgeBaseService,
    ) -> None:
        self.agent_service = agent_service
        self.model_service = model_service
        self.credential_service = credential_service
        self.tool_service = tool_service
        self.kb_service = kb_service

    async def check(self, root_agent_id: int) -> AgentReadinessRead:
        """BFS đệ quy toàn bộ agent + sub-agent trong graph, dedupe qua `visited` (1 sub-agent có
        thể được nhiều orchestrator gọi — ADR-0006 many-to-many). Không mượn `MAX_DELEGATION_DEPTH`
        (`chat/graph.py`) — cycle đã bị chặn lúc tạo `AgentDelegation`
        (`AgentService._creates_cycle`), tránh phụ thuộc ngược `agent` → `chat`."""
        visited: set[int] = set()
        queue: list[int] = [root_agent_id]
        nodes: list[AgentNodeReadiness] = []

        while queue:
            agent_id = queue.pop(0)
            if agent_id in visited:
                continue
            visited.add(agent_id)

            agent = await self.agent_service.find(agent_id)
            if agent is None:
                nodes.append(
                    AgentNodeReadiness(
                        agent_id=agent_id, ready=False, issues=["Agent không tồn tại"]
                    )
                )
                continue

            issues = await self._check_agent(agent_id, agent.model_id)
            nodes.append(AgentNodeReadiness(agent_id=agent_id, ready=not issues, issues=issues))

            if agent.is_orchestrator:
                sub_agents = await self.agent_service.list_sub_agents(agent_id)
                queue.extend(sa.id for sa in sub_agents)

        return AgentReadinessRead(nodes=nodes)

    async def _check_agent(self, agent_id: int, model_id: int) -> list[str]:
        issues: list[str] = []

        model = await self.model_service.find(model_id)
        if model is None:
            issues.append("Model không tồn tại")
        else:
            if model.provider in CREDENTIAL_PROVIDERS:
                credential = await self.credential_service.find_by_provider(model.provider)
                if credential is None:
                    issues.append(f"Thiếu credential cho provider '{model.provider}'")
                elif not credential.is_valid:
                    issues.append(f"Credential provider '{model.provider}' không hợp lệ")

        for tool in await self.tool_service.list_for_agent(agent_id):
            if tool.kind != "http":
                continue
            issue = config_issue_for_kind(tool.kind, tool.config)
            if issue is not None:
                issues.append(f"Tool '{tool.slug}': {issue}")

        for kb in await self.kb_service.list_for_agent(agent_id):
            stats = await self.kb_service.get_stats(kb.id)
            if stats.total_chunks == 0:
                issues.append(f"Knowledge base '{kb.slug}' chưa có chunk nào (rỗng)")

        return issues
