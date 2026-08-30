'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { agentService } from '../services/agent.service';
import { orchestratorTreeQueryKey } from './useOrchestratorTree';
import { readinessQueryKey } from './useReadiness';

/**
 * `rootAgentId` = gốc cây orchestrator đang xem (`OrchestratorCanvas`) — cùng lý do với
 * `useRemoveDelegation`: edge được sửa có thể ở bất kỳ tầng nào trong cây đa tầng, `orchestratorId`
 * thật truyền qua `mutate()`, `rootAgentId` chỉ dùng để invalidate đúng query của canvas đang mở.
 */
export function useUpdateDelegation(rootAgentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orchestratorId,
      subAgentId,
      taskDescription,
    }: {
      orchestratorId: number;
      subAgentId: number;
      taskDescription: string | null;
    }) => agentService.updateDelegation(orchestratorId, subAgentId, taskDescription),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orchestratorTreeQueryKey(rootAgentId) });
      queryClient.invalidateQueries({ queryKey: readinessQueryKey(rootAgentId) });
    },
  });
}
