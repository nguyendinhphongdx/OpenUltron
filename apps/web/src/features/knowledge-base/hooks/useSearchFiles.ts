'use client';

import { useQuery } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';

export function useSearchFiles(kbId: number, query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['knowledge-bases', kbId, 'files', 'search', trimmed] as const,
    queryFn: () => knowledgeBaseService.searchFiles(kbId, trimmed),
    enabled: Number.isFinite(kbId) && trimmed.length > 0,
  });
}
