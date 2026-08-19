'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';
import type { FileCreateInput } from '../types/knowledge-base.types';
import { filesQueryKey } from './useFiles';

export function useCreateFile(kbId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FileCreateInput) => knowledgeBaseService.createFile(kbId, input),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: filesQueryKey(kbId, input.folder_id ?? null) });
    },
  });
}
