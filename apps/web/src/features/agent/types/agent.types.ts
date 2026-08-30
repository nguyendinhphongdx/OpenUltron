/**
 * Khớp `apps/api/app/modules/agent/schemas.py` — đổi shape ở BE thì sửa ở đây,
 * service/hook/component không tự đoán field.
 */

export interface Agent {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  system_prompt: string;
  model_id: number;
  is_orchestrator: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentCreateInput {
  slug: string;
  name: string;
  description?: string | null;
  system_prompt: string;
  model_id: number;
  is_orchestrator?: boolean;
}

export type AgentUpdateInput = Partial<
  Pick<Agent, 'name' | 'description' | 'system_prompt' | 'model_id' | 'is_orchestrator'>
>;

export interface AgentDelegation {
  id: number;
  orchestrator_agent_id: number;
  sub_agent_id: number;
  task_description: string | null;
}

/** Edge + sub-agent lồng — mirror `AgentDelegationDetailRead` (BE), dùng cho canvas (cần cả
 * `task_description` lẫn `Agent` đầy đủ của sub-agent trong 1 lần gọi). */
export interface AgentDelegationDetail {
  id: number;
  orchestrator_agent_id: number;
  sub_agent_id: number;
  task_description: string | null;
  sub_agent: Agent;
}

/** Readiness check cho 1 agent (node) trong graph — mirror `AgentNodeReadiness` (BE).
 * `issues` rỗng khi `ready=true`. */
export interface AgentNodeReadiness {
  agent_id: number;
  ready: boolean;
  issues: string[];
}

/** Readiness toàn graph — mirror `AgentReadinessRead` (BE). */
export interface AgentReadiness {
  nodes: AgentNodeReadiness[];
}

/** Node trong cây org-chart — Agent gốc `agents.slug` không đủ để phân biệt vị trí trong graph khi
 * 1 sub-agent xuất hiện dưới nhiều orchestrator (many-to-many, ADR-0006) nên canvas dùng key riêng.
 * `delegationId`/`taskDescription` mô tả cạnh (edge) từ orchestrator cha tới node này — `null` ở
 * node gốc (không có cha). */
export interface OrchestratorTreeNode {
  agent: Agent;
  delegationId: number | null;
  taskDescription: string | null;
  children: OrchestratorTreeNode[];
}
