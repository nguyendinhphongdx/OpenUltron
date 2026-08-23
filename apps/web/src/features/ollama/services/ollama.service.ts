/** Service layer — gọi `apiClient` thuần, không chứa React. `pull` không đi qua đây (SSE cần
 * `EventSource` với URL đầy đủ, xem `hooks/usePullOllamaModel.ts`) — chỉ export URL builder. */
import { apiClient, endpoints } from '@/lib/api';
import { ENV } from '@/constants/env';
import type { OllamaCatalogEntry, OllamaInstalledModel } from '../types/ollama.types';

export const ollamaService = {
  catalog: async (): Promise<OllamaCatalogEntry[]> => {
    const res = await apiClient.get<OllamaCatalogEntry[]>(endpoints.ollama.catalog);
    return res.data;
  },

  installed: async (): Promise<OllamaInstalledModel[]> => {
    const res = await apiClient.get<OllamaInstalledModel[]>(endpoints.ollama.installed);
    return res.data;
  },

  pullUrl: (model: string): string => `${ENV.apiBaseUrl}${endpoints.ollama.pull(model)}`,
};
