'use client';

import { useQuery } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';

export function foldersQueryKey(kbId: number, parentFolderId: number | null, limit?: number) {
  return limit != null
    ? (['knowledge-bases', kbId, 'folders', parentFolderId, limit] as const)
    : (['knowledge-bases', kbId, 'folders', parentFolderId] as const);
}

export function useFolders(kbId: number, parentFolderId: number | null = null, limit = 50) {
  return useQuery({
    queryKey: foldersQueryKey(kbId, parentFolderId, limit),
    queryFn: () => knowledgeBaseService.listFolders(kbId, parentFolderId, limit),
    enabled: Number.isFinite(kbId),
  });
}
