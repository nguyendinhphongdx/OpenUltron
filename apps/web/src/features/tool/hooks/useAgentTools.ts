'use client';

import { useQuery } from '@tanstack/react-query';

import { toolService } from '../services/tool.service';

export function agentToolsQueryKey(agentId: number) {
  return ['agents', agentId, 'tools'] as const;
}

export function useAgentTools(agentId: number) {
  return useQuery({
    queryKey: agentToolsQueryKey(agentId),
    queryFn: () => toolService.listForAgent(agentId),
    enabled: Number.isFinite(agentId),
  });
}
