'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { credentialService } from '../services/credential.service';
import type { CredentialProvider, CredentialUpsertInput } from '../types/credential.types';
import { CREDENTIALS_QUERY_KEY } from './useCredentials';

export function useUpsertCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, input }: { provider: CredentialProvider; input: CredentialUpsertInput }) =>
      credentialService.upsert(provider, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDENTIALS_QUERY_KEY });
    },
  });
}
