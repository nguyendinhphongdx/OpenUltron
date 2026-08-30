'use client';

import { useQuery } from '@tanstack/react-query';

import { agentService } from '../services/agent.service';
import type { Agent, OrchestratorTreeNode } from '../types/agent.types';

// Khớp `MAX_DELEGATION_DEPTH` ở `apps/api/app/modules/chat/graph.py` — lưới an toàn phía FE nếu
// cycle lọt qua check backend (`AgentService._creates_cycle`), không phải cơ chế chính.
const MAX_DEPTH = 5;

async function buildTree(
  agent: Agent,
  depth: number,
  delegationId: number | null,
  taskDescription: string | null,
): Promise<OrchestratorTreeNode> {
  if (!agent.is_orchestrator || depth >= MAX_DEPTH) {
    return { agent, delegationId, taskDescription, children: [] };
  }
  const delegations = await agentService.listDelegationDetails(agent.id);
  const children = await Promise.all(
    delegations.map((d) => buildTree(d.sub_agent, depth + 1, d.id, d.task_description)),
  );
  return { agent, delegationId, taskDescription, children };
}

export function orchestratorTreeQueryKey(rootAgentId: number) {
  return ['agents', rootAgentId, 'orchestrator-tree'] as const;
}

/** Đệ quy toàn bộ cây delegation (đa tầng, ADR-0006 mở rộng) bắt đầu từ 1 orchestrator gốc. */
export function useOrchestratorTree(rootAgentId: number) {
  return useQuery({
    queryKey: orchestratorTreeQueryKey(rootAgentId),
    queryFn: async () => {
      const root = await agentService.get(rootAgentId);
      return buildTree(root, 0, null, null);
    },
    enabled: Number.isFinite(rootAgentId),
  });
}
