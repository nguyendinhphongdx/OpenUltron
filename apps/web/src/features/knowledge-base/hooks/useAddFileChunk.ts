'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';
import type { ChunkCreateInput } from '../types/knowledge-base.types';
import { filesQueryKey } from './useFiles';

export function useAddFileChunk(kbId: number, folderId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, input }: { fileId: number; input: ChunkCreateInput }) =>
      knowledgeBaseService.addFileChunk(kbId, fileId, input),
    onSuccess: () => {
      // File.status đổi (pending -> done/error) — refetch danh sách file trong folder này.
      queryClient.invalidateQueries({ queryKey: filesQueryKey(kbId, folderId) });
    },
  });
}
