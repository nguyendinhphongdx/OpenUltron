'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { agentService } from '../services/agent.service';
import { AGENTS_QUERY_KEY } from './useAgents';

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => agentService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENTS_QUERY_KEY });
    },
  });
}
