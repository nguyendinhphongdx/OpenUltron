'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { agentService } from '../services/agent.service';
import { orchestratorTreeQueryKey } from './useOrchestratorTree';
import { readinessQueryKey } from './useReadiness';

/**
 * `rootAgentId` = gốc cây orchestrator đang xem (`OrchestratorCanvas`) — không phải orchestrator
 * trực tiếp của delegation bị xoá, vì cây đa tầng (ADR-0006 mở rộng) có thể xoá edge ở bất kỳ
 * tầng nào, mỗi edge có `orchestratorId` cha riêng khác `rootAgentId`. Vì vậy `orchestratorId`
 * thật truyền qua `mutate()` (biến theo edge), còn `rootAgentId` chỉ dùng để invalidate đúng
 * `orchestratorTreeQueryKey` của canvas đang mở.
 */
export function useRemoveDelegation(rootAgentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orchestratorId, subAgentId }: { orchestratorId: number; subAgentId: number }) =>
      agentService.removeDelegation(orchestratorId, subAgentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orchestratorTreeQueryKey(rootAgentId) });
      queryClient.invalidateQueries({ queryKey: readinessQueryKey(rootAgentId) });
    },
  });
}
