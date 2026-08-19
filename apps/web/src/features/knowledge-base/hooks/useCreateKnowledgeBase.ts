'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';
import { KNOWLEDGE_BASES_QUERY_KEY } from './useKnowledgeBases';

export function useCreateKnowledgeBase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: knowledgeBaseService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KNOWLEDGE_BASES_QUERY_KEY });
    },
  });
}
