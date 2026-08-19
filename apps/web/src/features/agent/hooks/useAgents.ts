'use client';

import { useQuery } from '@tanstack/react-query';

import { agentService } from '../services/agent.service';

export const AGENTS_QUERY_KEY = ['agents'] as const;

export function useAgents() {
  return useQuery({
    queryKey: AGENTS_QUERY_KEY,
    queryFn: agentService.list,
  });
}
