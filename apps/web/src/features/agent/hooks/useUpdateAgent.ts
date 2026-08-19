'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { agentService } from '../services/agent.service';
import type { AgentUpdateInput } from '../types/agent.types';
import { AGENTS_QUERY_KEY } from './useAgents';
import { agentQueryKey } from './useAgent';

export function useUpdateAgent(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AgentUpdateInput) => agentService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: agentQueryKey(id) });
    },
  });
}
