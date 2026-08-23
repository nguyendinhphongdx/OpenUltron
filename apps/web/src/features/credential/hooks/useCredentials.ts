'use client';

import { useQuery } from '@tanstack/react-query';

import { credentialService } from '../services/credential.service';

export const CREDENTIALS_QUERY_KEY = ['credentials'] as const;

export function useCredentials() {
  return useQuery({
    queryKey: CREDENTIALS_QUERY_KEY,
    queryFn: credentialService.list,
  });
}
