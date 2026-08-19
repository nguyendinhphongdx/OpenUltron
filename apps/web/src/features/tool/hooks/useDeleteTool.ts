'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toolService } from '../services/tool.service';
import { TOOLS_QUERY_KEY } from './useTools';

export function useDeleteTool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => toolService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TOOLS_QUERY_KEY });
    },
  });
}
