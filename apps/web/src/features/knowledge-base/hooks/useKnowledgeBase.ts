'use client';

import { useQuery } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';
import { KNOWLEDGE_BASES_QUERY_KEY } from './useKnowledgeBases';

export function knowledgeBaseQueryKey(id: number) {
  return [...KNOWLEDGE_BASES_QUERY_KEY, id] as const;
}

export function useKnowledgeBase(id: number) {
  return useQuery({
    queryKey: knowledgeBaseQueryKey(id),
    queryFn: () => knowledgeBaseService.get(id),
    enabled: Number.isFinite(id),
  });
}
