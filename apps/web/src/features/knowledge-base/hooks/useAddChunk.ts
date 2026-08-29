'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';
import type { ChunkCreateInput } from '../types/knowledge-base.types';
import { knowledgeBaseStatsQueryKey } from './useKnowledgeBaseStats';

export function chunksQueryKey(kbId: number) {
  return ['knowledge-bases', kbId, 'chunks'] as const;
}

export function useAddChunk(kbId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChunkCreateInput) => knowledgeBaseService.addChunk(kbId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chunksQueryKey(kbId) });
      queryClient.invalidateQueries({ queryKey: knowledgeBaseStatsQueryKey(kbId) });
    },
  });
}
