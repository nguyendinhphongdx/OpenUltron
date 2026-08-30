/** Service layer — gọi `apiClient` thuần, không chứa React. */
import { apiClient, endpoints } from '@/lib/api';
import type {
  ChunkCreateInput,
  FileCreateInput,
  FolderCreateInput,
  KnowledgeBase,
  KnowledgeBaseCreateInput,
  KnowledgeBaseStats,
  KnowledgeBaseUpdateInput,
  KnowledgeChunk,
  KnowledgeFile,
  KnowledgeFolder,
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

  getStats: async (id: number): Promise<KnowledgeBaseStats> => {
    const res = await apiClient.get<KnowledgeBaseStats>(endpoints.knowledgeBases.stats(id));
    return res.data;
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

  unassignFromAgent: async (agentId: number, kbId: number): Promise<void> => {
    await apiClient.delete(endpoints.agents.unassignKnowledgeBase(agentId, kbId));
  },

  listFolders: async (
    kbId: number,
    parentFolderId?: number | null,
    limit = 50,
  ): Promise<KnowledgeFolder[]> => {
    const res = await apiClient.get<KnowledgeFolder[]>(endpoints.knowledgeBases.folders(kbId), {
      params: { parent_folder_id: parentFolderId ?? undefined, limit },
    });
    return res.data;
  },

  createFolder: async (kbId: number, input: FolderCreateInput): Promise<KnowledgeFolder> => {
    const res = await apiClient.post<KnowledgeFolder>(endpoints.knowledgeBases.folders(kbId), input);
    return res.data;
  },

  deleteFolder: async (kbId: number, folderId: number): Promise<void> => {
    await apiClient.delete(endpoints.knowledgeBases.folderById(kbId, folderId));
  },

  getFolder: async (kbId: number, folderId: number): Promise<KnowledgeFolder> => {
    const res = await apiClient.get<KnowledgeFolder>(endpoints.knowledgeBases.folderById(kbId, folderId));
    return res.data;
  },

  getFile: async (kbId: number, fileId: number): Promise<KnowledgeFile> => {
    const res = await apiClient.get<KnowledgeFile>(endpoints.knowledgeBases.fileById(kbId, fileId));
    return res.data;
  },

  listFiles: async (kbId: number, folderId?: number | null, limit = 50): Promise<KnowledgeFile[]> => {
    const res = await apiClient.get<KnowledgeFile[]>(endpoints.knowledgeBases.files(kbId), {
      params: { folder_id: folderId ?? undefined, limit },
    });
    return res.data;
  },

  searchFiles: async (kbId: number, query: string): Promise<KnowledgeFile[]> => {
    const res = await apiClient.get<KnowledgeFile[]>(endpoints.knowledgeBases.filesSearch(kbId), {
      params: { q: query },
    });
    return res.data;
  },

  createFile: async (kbId: number, input: FileCreateInput): Promise<KnowledgeFile> => {
    const res = await apiClient.post<KnowledgeFile>(endpoints.knowledgeBases.files(kbId), input);
    return res.data;
  },

  deleteFile: async (kbId: number, fileId: number): Promise<void> => {
    await apiClient.delete(endpoints.knowledgeBases.fileById(kbId, fileId));
  },

  addFileChunk: async (
    kbId: number,
    fileId: number,
    input: ChunkCreateInput,
  ): Promise<KnowledgeChunk> => {
    const res = await apiClient.post<KnowledgeChunk>(
      endpoints.knowledgeBases.fileChunks(kbId, fileId),
      input,
    );
    return res.data;
  },

  listFileChunks: async (kbId: number, fileId: number): Promise<KnowledgeChunk[]> => {
    const res = await apiClient.get<KnowledgeChunk[]>(endpoints.knowledgeBases.fileChunks(kbId, fileId));
    return res.data;
  },
};
