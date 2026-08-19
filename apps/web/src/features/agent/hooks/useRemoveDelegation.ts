'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { agentService } from '../services/agent.service';
import { subAgentsQueryKey } from './useSubAgents';

export function useRemoveDelegation(orchestratorId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subAgentId: number) => agentService.removeDelegation(orchestratorId, subAgentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subAgentsQueryKey(orchestratorId) });
    },
  });
}
