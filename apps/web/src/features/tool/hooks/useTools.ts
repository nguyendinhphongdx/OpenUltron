'use client';

import { useQuery } from '@tanstack/react-query';

import { toolService } from '../services/tool.service';

export const TOOLS_QUERY_KEY = ['tools'] as const;

export function useTools() {
  return useQuery({
    queryKey: TOOLS_QUERY_KEY,
    queryFn: toolService.list,
  });
}
