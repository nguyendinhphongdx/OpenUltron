/** Service layer — gọi `apiClient` thuần, không chứa React. */
import { apiClient, endpoints } from '@/lib/api';
import type { AppSettings, AppSettingsUpdateInput } from '../types/settings.types';

export const settingsService = {
  get: async (): Promise<AppSettings> => {
    const res = await apiClient.get<AppSettings>(endpoints.settings.get);
    return res.data;
  },

  update: async (input: AppSettingsUpdateInput): Promise<AppSettings> => {
    const res = await apiClient.patch<AppSettings>(endpoints.settings.update, input);
    return res.data;
  },
};
