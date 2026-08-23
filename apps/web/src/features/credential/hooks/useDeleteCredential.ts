'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { credentialService } from '../services/credential.service';
import type { CredentialProvider } from '../types/credential.types';
import { CREDENTIALS_QUERY_KEY } from './useCredentials';

export function useDeleteCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: CredentialProvider) => credentialService.remove(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDENTIALS_QUERY_KEY });
    },
  });
}
