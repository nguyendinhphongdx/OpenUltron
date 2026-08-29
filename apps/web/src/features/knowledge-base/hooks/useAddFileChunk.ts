'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';
import type { ChunkCreateInput } from '../types/knowledge-base.types';
import { fileChunksQueryKey } from './useFileChunks';
import { fileQueryKey } from './useFile';
import { filesQueryKey } from './useFiles';
import { knowledgeBaseStatsQueryKey } from './useKnowledgeBaseStats';

export function useAddFileChunk(kbId: number, folderId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, input }: { fileId: number; input: ChunkCreateInput }) =>
      knowledgeBaseService.addFileChunk(kbId, fileId, input),
    onSuccess: (_, { fileId }) => {
      // File.status đổi (pending -> done/error) — refetch danh sách file trong folder này + file đơn.
      queryClient.invalidateQueries({ queryKey: filesQueryKey(kbId, folderId) });
      queryClient.invalidateQueries({ queryKey: fileQueryKey(kbId, fileId) });
      queryClient.invalidateQueries({ queryKey: fileChunksQueryKey(kbId, fileId) });
      queryClient.invalidateQueries({ queryKey: knowledgeBaseStatsQueryKey(kbId) });
    },
  });
}
