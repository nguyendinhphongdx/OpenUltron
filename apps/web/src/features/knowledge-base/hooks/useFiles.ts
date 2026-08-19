'use client';

import { useQuery } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';

export function filesQueryKey(kbId: number, folderId: number | null) {
  return ['knowledge-bases', kbId, 'files', folderId] as const;
}

export function useFiles(kbId: number, folderId: number | null = null) {
  return useQuery({
    queryKey: filesQueryKey(kbId, folderId),
    queryFn: () => knowledgeBaseService.listFiles(kbId, folderId),
    enabled: Number.isFinite(kbId),
  });
}
