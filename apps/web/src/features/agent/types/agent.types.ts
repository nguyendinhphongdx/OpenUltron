/**
 * Khớp `apps/api/app/modules/agent/schemas.py` — đổi shape ở BE thì sửa ở đây,
 * service/hook/component không tự đoán field.
 */

/** ADR-0021 — "react" (mặc định, ReAct interleave) | "plan_execute" (lập plan trước rồi thực thi
 * tuần tự). Chỉ có ý nghĩa khi agent chạy như top-level (chat trực tiếp/orchestrator gốc); khi
 * agent này được dùng làm sub-agent, field bị bỏ qua ở backend (luôn `react`). */
export type ExecutionStrategy = 'react' | 'plan_execute';

export interface Agent {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  system_prompt: string;
  model_id: number;
  is_orchestrator: boolean;
  execution_strategy: ExecutionStrategy;
  /** Vị trí node của CHÍNH agent này khi nó là GỐC canvas orchestrator của nó
   * (docs/features/orchestrator-v2.md Phase C) — vị trí khi nó là node CON của 1 orchestrator
   * khác nằm ở `AgentDelegationDetail.pos_x/pos_y` (theo edge). */
  pos_x: number | null;
  pos_y: number | null;
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
  execution_strategy?: ExecutionStrategy;
}

export type AgentUpdateInput = Partial<
  Pick<
    Agent,
    | 'name'
    | 'description'
    | 'system_prompt'
    | 'model_id'
    | 'is_orchestrator'
    | 'execution_strategy'
    | 'pos_x'
    | 'pos_y'
  >
>;

export interface AgentDelegation {
  id: number;
  orchestrator_agent_id: number;
  sub_agent_id: number;
  task_description: string | null;
}

/** Edge + sub-agent lồng — mirror `AgentDelegationDetailRead` (BE), dùng cho canvas (cần cả
 * `task_description` lẫn `Agent` đầy đủ của sub-agent trong 1 lần gọi). `pos_x`/`pos_y` là vị trí
 * node `sub_agent` TRONG canvas của `orchestrator_agent_id` này (theo edge, Phase C). `last_run_*`
 * là trace "lần chạy gần nhất" của cạnh này — `null` khi chưa từng chạy. */
export interface AgentDelegationDetail {
  id: number;
  orchestrator_agent_id: number;
  sub_agent_id: number;
  task_description: string | null;
  pos_x: number | null;
  pos_y: number | null;
  last_run_at: string | null;
  last_run_output: string | null;
  last_run_error: string | null;
  last_run_duration_ms: number | null;
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
 * node gốc (không có cha). `posX`/`posY`/`lastRun*` (Phase C) đọc từ `agent.pos_x/pos_y` ở node
 * gốc, hoặc từ `AgentDelegationDetail` tương ứng ở node con. */
export interface OrchestratorTreeNode {
  agent: Agent;
  delegationId: number | null;
  taskDescription: string | null;
  posX: number | null;
  posY: number | null;
  lastRunAt: string | null;
  lastRunOutput: string | null;
  lastRunError: string | null;
  lastRunDurationMs: number | null;
  children: OrchestratorTreeNode[];
}
