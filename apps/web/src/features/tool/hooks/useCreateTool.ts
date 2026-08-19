'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toolService } from '../services/tool.service';
import { TOOLS_QUERY_KEY } from './useTools';

export function useCreateTool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toolService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TOOLS_QUERY_KEY });
    },
  });
}
