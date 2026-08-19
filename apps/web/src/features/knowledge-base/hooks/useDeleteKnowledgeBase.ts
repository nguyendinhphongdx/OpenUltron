'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';
import { KNOWLEDGE_BASES_QUERY_KEY } from './useKnowledgeBases';

export function useDeleteKnowledgeBase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => knowledgeBaseService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KNOWLEDGE_BASES_QUERY_KEY });
    },
  });
}
