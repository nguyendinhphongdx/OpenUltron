'use client';

import { useQuery } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';

export function fileChunksQueryKey(kbId: number, fileId: number) {
  return ['knowledge-bases', kbId, 'files', fileId, 'chunks'] as const;
}

export function useFileChunks(kbId: number, fileId: number) {
  return useQuery({
    queryKey: fileChunksQueryKey(kbId, fileId),
    queryFn: () => knowledgeBaseService.listFileChunks(kbId, fileId),
    enabled: Number.isFinite(kbId) && Number.isFinite(fileId),
  });
}
