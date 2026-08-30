/**
 * Endpoint path tập trung — service layer tham chiếu `endpoints.<resource>.xxx`
 * thay vì hardcode string rải rác (đổi 1 chỗ, mọi nơi update theo).
 * Khớp router `apps/api/app/modules/**\/router.py` (path, không phải business logic).
 */
export const endpoints = {
  conversations: {
    list: '/conversations',
    create: '/conversations',
    byId: (id: number) => `/conversations/${id}`,
    messages: (id: number) => `/conversations/${id}/messages`,
    chatAgui: (id: number) => `/conversations/${id}/chat/agui`,
  },
  agents: {
    list: '/agents',
    create: '/agents',
    byId: (id: number) => `/agents/${id}`,
    delegations: (id: number) => `/agents/${id}/delegations`,
    unassignDelegation: (orchestratorId: number, subAgentId: number) =>
      `/agents/${orchestratorId}/delegations/${subAgentId}`,
    subAgents: (id: number) => `/agents/${id}/sub-agents`,
    tools: (id: number) => `/agents/${id}/tools`,
    unassignTool: (agentId: number, toolId: number) => `/agents/${agentId}/tools/${toolId}`,
    knowledgeBases: (id: number) => `/agents/${id}/knowledge-bases`,
    unassignKnowledgeBase: (agentId: number, kbId: number) =>
      `/agents/${agentId}/knowledge-bases/${kbId}`,
  },
  models: {
    list: '/models',
    create: '/models',
    byId: (id: number) => `/models/${id}`,
    catalog: (provider: string) => `/models/catalog?provider=${provider}`,
  },
  tools: {
    list: '/tools',
    create: '/tools',
    byId: (id: number) => `/tools/${id}`,
    builtinCatalog: '/tools/builtin-catalog',
  },
  credentials: {
    list: '/credentials',
    upsert: (provider: string) => `/credentials/${provider}`,
    delete: (provider: string) => `/credentials/${provider}`,
    testConnection: (provider: string) => `/credentials/${provider}/test-connection`,
  },
  ollama: {
    catalog: '/ollama/catalog',
    installed: '/ollama/installed',
    pull: (model: string) => `/ollama/pull?model=${encodeURIComponent(model)}`,
  },
  knowledgeBases: {
    list: '/knowledge-bases',
    create: '/knowledge-bases',
    byId: (id: number) => `/knowledge-bases/${id}`,
    stats: (id: number) => `/knowledge-bases/${id}/stats`,
    chunks: (id: number) => `/knowledge-bases/${id}/chunks`,
    search: (id: number) => `/knowledge-bases/${id}/search`,
    folders: (id: number) => `/knowledge-bases/${id}/folders`,
    folderById: (kbId: number, folderId: number) => `/knowledge-bases/${kbId}/folders/${folderId}`,
    files: (id: number) => `/knowledge-bases/${id}/files`,
    filesSearch: (id: number) => `/knowledge-bases/${id}/files/search`,
    fileById: (kbId: number, fileId: number) => `/knowledge-bases/${kbId}/files/${fileId}`,
    fileChunks: (kbId: number, fileId: number) =>
      `/knowledge-bases/${kbId}/files/${fileId}/chunks`,
  },
  settings: {
    get: '/settings',
    update: '/settings',
  },
} as const;
