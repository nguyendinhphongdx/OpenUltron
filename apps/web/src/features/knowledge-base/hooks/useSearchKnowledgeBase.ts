'use client';

import { useMutation } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';

export function useSearchKnowledgeBase(kbId: number) {
  return useMutation({
    mutationFn: ({ query, topK }: { query: string; topK?: number }) =>
      knowledgeBaseService.search(kbId, query, topK),
  });
}
