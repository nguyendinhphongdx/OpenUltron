'use client';

import { useQuery } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';

export const KNOWLEDGE_BASES_QUERY_KEY = ['knowledge-bases'] as const;

export function useKnowledgeBases() {
  return useQuery({
    queryKey: KNOWLEDGE_BASES_QUERY_KEY,
    queryFn: knowledgeBaseService.list,
  });
}
