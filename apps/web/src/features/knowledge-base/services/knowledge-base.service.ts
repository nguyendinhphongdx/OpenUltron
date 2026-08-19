/** Service layer — gọi `apiClient` thuần, không chứa React. */
import { apiClient, endpoints } from '@/lib/api';
import type {
  ChunkCreateInput,
  FileCreateInput,
  FolderCreateInput,
  KnowledgeBase,
  KnowledgeBaseCreateInput,
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

  listFolders: async (kbId: number, parentFolderId?: number | null): Promise<KnowledgeFolder[]> => {
    const res = await apiClient.get<KnowledgeFolder[]>(endpoints.knowledgeBases.folders(kbId), {
      params: parentFolderId != null ? { parent_folder_id: parentFolderId } : undefined,
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

  listFiles: async (kbId: number, folderId?: number | null): Promise<KnowledgeFile[]> => {
    const res = await apiClient.get<KnowledgeFile[]>(endpoints.knowledgeBases.files(kbId), {
      params: folderId != null ? { folder_id: folderId } : undefined,
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
};
