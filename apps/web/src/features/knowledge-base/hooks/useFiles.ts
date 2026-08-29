'use client';

import { useQuery } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';

export function filesQueryKey(kbId: number, folderId: number | null, limit?: number) {
  return limit != null
    ? (['knowledge-bases', kbId, 'files', folderId, limit] as const)
    : (['knowledge-bases', kbId, 'files', folderId] as const);
}

export function useFiles(kbId: number, folderId: number | null = null, limit = 50) {
  return useQuery({
    queryKey: filesQueryKey(kbId, folderId, limit),
    queryFn: () => knowledgeBaseService.listFiles(kbId, folderId, limit),
    enabled: Number.isFinite(kbId),
  });
}
