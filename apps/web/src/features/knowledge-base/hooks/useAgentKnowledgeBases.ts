'use client';

import { useQuery } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';

export function agentKnowledgeBasesQueryKey(agentId: number) {
  return ['agents', agentId, 'knowledge-bases'] as const;
}

export function useAgentKnowledgeBases(agentId: number) {
  return useQuery({
    queryKey: agentKnowledgeBasesQueryKey(agentId),
    queryFn: () => knowledgeBaseService.listForAgent(agentId),
    enabled: Number.isFinite(agentId),
  });
}
