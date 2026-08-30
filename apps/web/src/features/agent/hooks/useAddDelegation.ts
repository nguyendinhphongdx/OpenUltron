'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { agentService } from '../services/agent.service';
import { subAgentsQueryKey } from './useSubAgents';
import { readinessQueryKey } from './useReadiness';

/**
 * `rootAgentId` optional — chỉ cần khi hook được dùng trong `OrchestratorCanvas` (readiness gắn
 * với gốc cây đang xem, có thể khác `orchestratorId` — node cha trực tiếp — trong cây đa tầng).
 * `DelegationManager` (view 1 agent đơn lẻ, không có canvas readiness) không truyền tham số này.
 */
export function useAddDelegation(orchestratorId: number, rootAgentId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subAgentId: number) => agentService.addDelegation(orchestratorId, subAgentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subAgentsQueryKey(orchestratorId) });
      if (Number.isFinite(rootAgentId)) {
        queryClient.invalidateQueries({ queryKey: readinessQueryKey(rootAgentId as number) });
      }
    },
  });
}
