/** Service layer — gọi `apiClient` thuần, không chứa React. */
import { apiClient, endpoints } from '@/lib/api';
import type { Agent, AgentCreateInput, AgentDelegation, AgentUpdateInput } from '../types/agent.types';

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
};
