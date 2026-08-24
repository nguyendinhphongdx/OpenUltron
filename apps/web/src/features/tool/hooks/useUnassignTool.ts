'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toolService } from '../services/tool.service';
import { agentToolsQueryKey } from './useAgentTools';

export function useUnassignTool(agentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (toolId: number) => toolService.unassignFromAgent(agentId, toolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentToolsQueryKey(agentId) });
    },
  });
}
