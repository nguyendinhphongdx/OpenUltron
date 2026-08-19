/** Service layer — gọi `apiClient` thuần, không chứa React. */
import { apiClient, endpoints } from '@/lib/api';
import type {
  ChunkCreateInput,
  KnowledgeBase,
  KnowledgeBaseCreateInput,
  KnowledgeBaseUpdateInput,
  KnowledgeChunk,
  SearchResult,
} from '../types/knowledge-base.types';

export const knowledgeBaseService = {
  list: async (): Promise<KnowledgeBase[]> => {
    const res = await apiClient.get<KnowledgeBase[]>(endpoints.knowledgeBases.list);
    return res.data;
  },

  get: async (id: number): Promise<KnowledgeBase> => {
    const res = await apiClient.get<KnowledgeBase>(endpoints.knowledgeBases.byId(id));
    return res.data;
  },

  create: async (input: KnowledgeBaseCreateInput): Promise<KnowledgeBase> => {
    const res = await apiClient.post<KnowledgeBase>(endpoints.knowledgeBases.create, input);
    return res.data;
  },

  update: async (id: number, input: KnowledgeBaseUpdateInput): Promise<KnowledgeBase> => {
    const res = await apiClient.patch<KnowledgeBase>(endpoints.knowledgeBases.byId(id), input);
    return res.data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(endpoints.knowledgeBases.byId(id));
  },

  addChunk: async (kbId: number, input: ChunkCreateInput): Promise<KnowledgeChunk> => {
    const res = await apiClient.post<KnowledgeChunk>(endpoints.knowledgeBases.chunks(kbId), input);
    return res.data;
  },

  search: async (kbId: number, query: string, topK = 5): Promise<SearchResult[]> => {
    const res = await apiClient.post<SearchResult[]>(endpoints.knowledgeBases.search(kbId), {
      query,
      top_k: topK,
    });
    return res.data;
  },

  listForAgent: async (agentId: number): Promise<KnowledgeBase[]> => {
    const res = await apiClient.get<KnowledgeBase[]>(endpoints.agents.knowledgeBases(agentId));
    return res.data;
  },

  assignToAgent: async (agentId: number, kbId: number): Promise<void> => {
    await apiClient.post(endpoints.agents.knowledgeBases(agentId), { kb_id: kbId });
  },
};
