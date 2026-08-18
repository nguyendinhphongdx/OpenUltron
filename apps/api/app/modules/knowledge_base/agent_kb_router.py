from fastapi import APIRouter, status

from app.modules.knowledge_base.deps import KnowledgeBaseServiceDep
from app.modules.knowledge_base.schemas import AgentKnowledgeBaseCreate, KnowledgeBaseRead

router = APIRouter(prefix="/agents/{agent_id}/knowledge-bases", tags=["agent-knowledge-bases"])


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
async def assign_kb(
    agent_id: int, body: AgentKnowledgeBaseCreate, service: KnowledgeBaseServiceDep
) -> None:
    await service.assign_to_agent(agent_id, body.kb_id)


@router.get("", response_model=list[KnowledgeBaseRead])
async def list_agent_kbs(
    agent_id: int, service: KnowledgeBaseServiceDep
) -> list[KnowledgeBaseRead]:
    return await service.list_for_agent(agent_id)
