'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';
import type { KnowledgeBaseUpdateInput } from '../types/knowledge-base.types';
import { knowledgeBaseQueryKey } from './useKnowledgeBase';
import { KNOWLEDGE_BASES_QUERY_KEY } from './useKnowledgeBases';

export function useUpdateKnowledgeBase(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: KnowledgeBaseUpdateInput) => knowledgeBaseService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KNOWLEDGE_BASES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: knowledgeBaseQueryKey(id) });
    },
  });
}
