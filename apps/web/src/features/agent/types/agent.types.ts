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
}

/** Node trong cây org-chart — Agent gốc `agents.slug` không đủ để phân biệt vị trí trong graph khi
 * 1 sub-agent xuất hiện dưới nhiều orchestrator (many-to-many, ADR-0006) nên canvas dùng key riêng. */
export interface OrchestratorTreeNode {
  agent: Agent;
  children: OrchestratorTreeNode[];
}
