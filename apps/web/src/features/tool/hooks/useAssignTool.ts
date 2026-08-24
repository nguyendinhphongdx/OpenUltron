'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toolService } from '../services/tool.service';
import { agentToolsQueryKey } from './useAgentTools';

export function useAssignTool(agentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (toolId: number) => toolService.assignToAgent(agentId, toolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentToolsQueryKey(agentId) });
    },
  });
}
