'use client';

import { useQuery } from '@tanstack/react-query';

import { agentService } from '../services/agent.service';
import type { Agent, AgentDelegationDetail, OrchestratorTreeNode } from '../types/agent.types';

// Khớp `MAX_DELEGATION_DEPTH` ở `apps/api/app/modules/chat/graph.py` — lưới an toàn phía FE nếu
// cycle lọt qua check backend (`AgentService._creates_cycle`), không phải cơ chế chính.
const MAX_DEPTH = 5;

/** Đặc điểm cạnh (edge) từ orchestrator cha tới node này — `null` ở node gốc (không có cha, dùng
 * `agent.pos_x/pos_y` thay thế, không có trace vì gốc không phải kết quả 1 lần gọi tool). */
type EdgeInfo = Pick<
  AgentDelegationDetail,
  | 'id'
  | 'task_description'
  | 'pos_x'
  | 'pos_y'
  | 'last_run_at'
  | 'last_run_output'
  | 'last_run_error'
  | 'last_run_duration_ms'
>;

async function buildTree(
  agent: Agent,
  depth: number,
  edge: EdgeInfo | null,
): Promise<OrchestratorTreeNode> {
  const node: Omit<OrchestratorTreeNode, 'children'> = {
    agent,
    delegationId: edge?.id ?? null,
    taskDescription: edge?.task_description ?? null,
    posX: edge?.pos_x ?? agent.pos_x,
    posY: edge?.pos_y ?? agent.pos_y,
    lastRunAt: edge?.last_run_at ?? null,
    lastRunOutput: edge?.last_run_output ?? null,
    lastRunError: edge?.last_run_error ?? null,
    lastRunDurationMs: edge?.last_run_duration_ms ?? null,
  };
  if (!agent.is_orchestrator || depth >= MAX_DEPTH) {
    return { ...node, children: [] };
  }
  const delegations = await agentService.listDelegationDetails(agent.id);
  const children = await Promise.all(
    delegations.map((d) => buildTree(d.sub_agent, depth + 1, d)),
  );
  return { ...node, children };
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
      return buildTree(root, 0, null);
    },
    enabled: Number.isFinite(rootAgentId),
  });
}
