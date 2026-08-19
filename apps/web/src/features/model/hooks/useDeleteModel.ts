'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { modelService } from '../services/model.service';
import { MODELS_QUERY_KEY } from './useModels';

export function useDeleteModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => modelService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MODELS_QUERY_KEY });
    },
  });
}
