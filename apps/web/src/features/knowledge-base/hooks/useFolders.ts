'use client';

import { useQuery } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';

export function foldersQueryKey(kbId: number, parentFolderId: number | null) {
  return ['knowledge-bases', kbId, 'folders', parentFolderId] as const;
}

export function useFolders(kbId: number, parentFolderId: number | null = null) {
  return useQuery({
    queryKey: foldersQueryKey(kbId, parentFolderId),
    queryFn: () => knowledgeBaseService.listFolders(kbId, parentFolderId),
    enabled: Number.isFinite(kbId),
  });
}
