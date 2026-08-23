/** Service layer — gọi `apiClient` thuần, không chứa React. */
import { apiClient, endpoints } from '@/lib/api';
import type { Credential, CredentialProvider, CredentialUpsertInput } from '../types/credential.types';

export const credentialService = {
  list: async (): Promise<Credential[]> => {
    const res = await apiClient.get<Credential[]>(endpoints.credentials.list);
    return res.data;
  },

  upsert: async (provider: CredentialProvider, input: CredentialUpsertInput): Promise<Credential> => {
    const res = await apiClient.put<Credential>(endpoints.credentials.upsert(provider), input);
    return res.data;
  },

  remove: async (provider: CredentialProvider): Promise<void> => {
    await apiClient.delete(endpoints.credentials.delete(provider));
  },

  testConnection: async (provider: CredentialProvider): Promise<Credential> => {
    const res = await apiClient.post<Credential>(endpoints.credentials.testConnection(provider));
    return res.data;
  },
};
