'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';
import { foldersQueryKey } from './useFolders';
import { knowledgeBaseStatsQueryKey } from './useKnowledgeBaseStats';

export function useDeleteFolder(kbId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ folderId }: { folderId: number; parentFolderId: number | null }) =>
      knowledgeBaseService.deleteFolder(kbId, folderId),
    onSuccess: (_, { parentFolderId }) => {
      queryClient.invalidateQueries({ queryKey: foldersQueryKey(kbId, parentFolderId) });
      queryClient.invalidateQueries({ queryKey: knowledgeBaseStatsQueryKey(kbId) });
    },
  });
}
