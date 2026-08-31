/** Service layer — gọi `apiClient` thuần, không chứa React. */
import { apiClient, endpoints } from '@/lib/api';
import type {
  Agent,
  AgentCreateInput,
  AgentDelegation,
  AgentDelegationDetail,
  AgentReadiness,
  AgentUpdateInput,
} from '../types/agent.types';

export const agentService = {
  list: async (): Promise<Agent[]> => {
    const res = await apiClient.get<Agent[]>(endpoints.agents.list);
    return res.data;
  },

  get: async (id: number): Promise<Agent> => {
    const res = await apiClient.get<Agent>(endpoints.agents.byId(id));
    return res.data;
  },

  create: async (input: AgentCreateInput): Promise<Agent> => {
    const res = await apiClient.post<Agent>(endpoints.agents.create, input);
    return res.data;
  },

  update: async (id: number, input: AgentUpdateInput): Promise<Agent> => {
    const res = await apiClient.patch<Agent>(endpoints.agents.byId(id), input);
    return res.data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(endpoints.agents.byId(id));
  },

  listSubAgents: async (id: number): Promise<Agent[]> => {
    const res = await apiClient.get<Agent[]>(endpoints.agents.subAgents(id));
    return res.data;
  },

  addDelegation: async (orchestratorId: number, subAgentId: number): Promise<AgentDelegation> => {
    const res = await apiClient.post<AgentDelegation>(endpoints.agents.delegations(orchestratorId), {
      sub_agent_id: subAgentId,
    });
    return res.data;
  },

  removeDelegation: async (orchestratorId: number, subAgentId: number): Promise<void> => {
    await apiClient.delete(endpoints.agents.unassignDelegation(orchestratorId, subAgentId));
  },

  listDelegationDetails: async (orchestratorId: number): Promise<AgentDelegationDetail[]> => {
    const res = await apiClient.get<AgentDelegationDetail[]>(
      endpoints.agents.delegations(orchestratorId),
    );
    return res.data;
  },

  /** Partial update (BE đọc qua `exclude_unset` — field không truyền ở `update` giữ nguyên giá
   * trị cũ, xem `AgentDelegationUpdate`/`AgentService.update_delegation`). Dùng chung cho cả sửa
   * task description (panel) lẫn lưu vị trí node kéo thả (Phase C, canvas) — 2 nơi gọi độc lập,
   * không được ghi đè field của nhau. */
  updateDelegation: async (
    orchestratorId: number,
    subAgentId: number,
    update: { taskDescription?: string | null; posX?: number; posY?: number },
  ): Promise<AgentDelegation> => {
    const res = await apiClient.patch<AgentDelegation>(
      endpoints.agents.unassignDelegation(orchestratorId, subAgentId),
      { task_description: update.taskDescription, pos_x: update.posX, pos_y: update.posY },
    );
    return res.data;
  },

  getReadiness: async (agentId: number): Promise<AgentReadiness> => {
    const res = await apiClient.get<AgentReadiness>(endpoints.agents.readiness(agentId));
    return res.data;
  },
};
