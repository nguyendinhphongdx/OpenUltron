'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';
import { agentKnowledgeBasesQueryKey } from './useAgentKnowledgeBases';

export function useAssignKnowledgeBase(agentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (kbId: number) => knowledgeBaseService.assignToAgent(agentId, kbId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKnowledgeBasesQueryKey(agentId) });
    },
  });
}
