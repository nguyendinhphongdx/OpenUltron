'use client';

import { useQuery } from '@tanstack/react-query';

import { agentService } from '../services/agent.service';

export function agentQueryKey(id: number) {
  return ['agents', id] as const;
}

export function useAgent(id: number) {
  return useQuery({
    queryKey: agentQueryKey(id),
    queryFn: () => agentService.get(id),
    enabled: Number.isFinite(id),
  });
}
