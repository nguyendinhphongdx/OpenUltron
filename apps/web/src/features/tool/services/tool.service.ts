/** Service layer — gọi `apiClient` thuần, không chứa React. */
import { apiClient, endpoints } from '@/lib/api';
import type { Tool, ToolCreateInput, ToolUpdateInput } from '../types/tool.types';

export const toolService = {
  list: async (): Promise<Tool[]> => {
    const res = await apiClient.get<Tool[]>(endpoints.tools.list);
    return res.data;
  },

  get: async (id: number): Promise<Tool> => {
    const res = await apiClient.get<Tool>(endpoints.tools.byId(id));
    return res.data;
  },

  create: async (input: ToolCreateInput): Promise<Tool> => {
    const res = await apiClient.post<Tool>(endpoints.tools.create, input);
    return res.data;
  },

  update: async (id: number, input: ToolUpdateInput): Promise<Tool> => {
    const res = await apiClient.patch<Tool>(endpoints.tools.byId(id), input);
    return res.data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(endpoints.tools.byId(id));
  },

  listForAgent: async (agentId: number): Promise<Tool[]> => {
    const res = await apiClient.get<Tool[]>(endpoints.agents.tools(agentId));
    return res.data;
  },

  assignToAgent: async (agentId: number, toolId: number): Promise<void> => {
    await apiClient.post(endpoints.agents.tools(agentId), { tool_id: toolId });
  },

  unassignFromAgent: async (agentId: number, toolId: number): Promise<void> => {
    await apiClient.delete(endpoints.agents.unassignTool(agentId, toolId));
  },
};
