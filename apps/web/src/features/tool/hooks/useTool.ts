'use client';

import { useQuery } from '@tanstack/react-query';

import { toolService } from '../services/tool.service';

export function useTool(id: number) {
  return useQuery({
    queryKey: ['tools', id] as const,
    queryFn: () => toolService.get(id),
    enabled: Number.isFinite(id),
  });
}
