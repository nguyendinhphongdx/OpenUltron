'use client';

import { useQuery } from '@tanstack/react-query';

import { agentService } from '../services/agent.service';

export function readinessQueryKey(rootAgentId: number) {
  return ['agents', rootAgentId, 'readiness'] as const;
}

/** Readiness check tự động khi mở canvas (quyết định đã chốt ở `docs/features/orchestrator-v2.md`
 * Phase B — không phải on-demand) — `staleTime: 0` để luôn refetch mỗi lần mount. */
export function useReadiness(rootAgentId: number) {
  return useQuery({
    queryKey: readinessQueryKey(rootAgentId),
    queryFn: () => agentService.getReadiness(rootAgentId),
    enabled: Number.isFinite(rootAgentId),
    staleTime: 0,
  });
}
