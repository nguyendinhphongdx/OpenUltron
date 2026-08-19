/** Service layer — gọi `apiClient` thuần, không chứa React. */
import { apiClient, endpoints } from '@/lib/api';
import type { Model, ModelCreateInput, ModelUpdateInput } from '../types/model.types';

export const modelService = {
  list: async (): Promise<Model[]> => {
    const res = await apiClient.get<Model[]>(endpoints.models.list);
    return res.data;
  },

  get: async (id: number): Promise<Model> => {
    const res = await apiClient.get<Model>(endpoints.models.byId(id));
    return res.data;
  },

  create: async (input: ModelCreateInput): Promise<Model> => {
    const res = await apiClient.post<Model>(endpoints.models.create, input);
    return res.data;
  },

  update: async (id: number, input: ModelUpdateInput): Promise<Model> => {
    const res = await apiClient.patch<Model>(endpoints.models.byId(id), input);
    return res.data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(endpoints.models.byId(id));
  },
};
