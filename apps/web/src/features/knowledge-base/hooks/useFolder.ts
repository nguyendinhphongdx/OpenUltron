'use client';

import { useQuery } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';

export function folderQueryKey(kbId: number, folderId: number) {
  return ['knowledge-bases', kbId, 'folders', 'byId', folderId] as const;
}

export function useFolder(kbId: number, folderId: number | null) {
  return useQuery({
    queryKey: folderQueryKey(kbId, folderId ?? -1),
    queryFn: () => knowledgeBaseService.getFolder(kbId, folderId as number),
    enabled: Number.isFinite(kbId) && folderId != null,
  });
}
