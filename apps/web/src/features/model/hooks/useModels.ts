'use client';

import { useQuery } from '@tanstack/react-query';

import { modelService } from '../services/model.service';

export const MODELS_QUERY_KEY = ['models'] as const;

export function useModels() {
  return useQuery({
    queryKey: MODELS_QUERY_KEY,
    queryFn: modelService.list,
  });
}
