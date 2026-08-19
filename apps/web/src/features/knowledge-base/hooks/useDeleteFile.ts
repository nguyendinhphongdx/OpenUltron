'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';
import { filesQueryKey } from './useFiles';

export function useDeleteFile(kbId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId }: { fileId: number; folderId: number | null }) =>
      knowledgeBaseService.deleteFile(kbId, fileId),
    onSuccess: (_, { folderId }) => {
      queryClient.invalidateQueries({ queryKey: filesQueryKey(kbId, folderId) });
    },
  });
}
