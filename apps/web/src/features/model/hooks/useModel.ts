'use client';

import { useQuery } from '@tanstack/react-query';

import { modelService } from '../services/model.service';
import { MODELS_QUERY_KEY } from './useModels';

export function useModel(id: number) {
  return useQuery({
    queryKey: [...MODELS_QUERY_KEY, id],
    queryFn: () => modelService.get(id),
    enabled: Number.isFinite(id),
  });
}
