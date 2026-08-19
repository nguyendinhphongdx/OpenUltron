'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toolService } from '../services/tool.service';
import type { ToolUpdateInput } from '../types/tool.types';
import { TOOLS_QUERY_KEY } from './useTools';

export function useUpdateTool(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ToolUpdateInput) => toolService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TOOLS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['tools', id] });
    },
  });
}
