'use client';

import { useQuery } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';

export function knowledgeBaseStatsQueryKey(kbId: number) {
  return ['knowledge-bases', kbId, 'stats'] as const;
}

export function useKnowledgeBaseStats(kbId: number) {
  return useQuery({
    queryKey: knowledgeBaseStatsQueryKey(kbId),
    queryFn: () => knowledgeBaseService.getStats(kbId),
    enabled: Number.isFinite(kbId),
  });
}
