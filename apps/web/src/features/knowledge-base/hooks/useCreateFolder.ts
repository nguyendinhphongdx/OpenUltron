'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';
import type { FolderCreateInput } from '../types/knowledge-base.types';
import { foldersQueryKey } from './useFolders';
import { knowledgeBaseStatsQueryKey } from './useKnowledgeBaseStats';

export function useCreateFolder(kbId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FolderCreateInput) => knowledgeBaseService.createFolder(kbId, input),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({
        queryKey: foldersQueryKey(kbId, input.parent_folder_id ?? null),
      });
      queryClient.invalidateQueries({ queryKey: knowledgeBaseStatsQueryKey(kbId) });
    },
  });
}
