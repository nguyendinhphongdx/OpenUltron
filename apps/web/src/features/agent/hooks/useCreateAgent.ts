'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { agentService } from '../services/agent.service';
import { AGENTS_QUERY_KEY } from './useAgents';

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: agentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENTS_QUERY_KEY });
    },
  });
}
