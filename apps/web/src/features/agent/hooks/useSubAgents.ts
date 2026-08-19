'use client';

import { useQuery } from '@tanstack/react-query';

import { agentService } from '../services/agent.service';

export function subAgentsQueryKey(orchestratorId: number) {
  return ['agents', orchestratorId, 'sub-agents'] as const;
}

export function useSubAgents(orchestratorId: number) {
  return useQuery({
    queryKey: subAgentsQueryKey(orchestratorId),
    queryFn: () => agentService.listSubAgents(orchestratorId),
    enabled: Number.isFinite(orchestratorId),
  });
}
