'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { modelService } from '../services/model.service';
import type { ModelUpdateInput } from '../types/model.types';
import { MODELS_QUERY_KEY } from './useModels';

export function useUpdateModel(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ModelUpdateInput) => modelService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MODELS_QUERY_KEY });
    },
  });
}
