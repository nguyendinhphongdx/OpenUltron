'use client';

import { useQuery } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';

export function fileQueryKey(kbId: number, fileId: number) {
  return ['knowledge-bases', kbId, 'files', 'byId', fileId] as const;
}

export function useFile(kbId: number, fileId: number) {
  return useQuery({
    queryKey: fileQueryKey(kbId, fileId),
    queryFn: () => knowledgeBaseService.getFile(kbId, fileId),
    enabled: Number.isFinite(kbId) && Number.isFinite(fileId),
  });
}
