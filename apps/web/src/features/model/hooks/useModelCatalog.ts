'use client';

import { useQuery } from '@tanstack/react-query';

import { modelService } from '../services/model.service';
import type { Provider } from '../types/model.types';

export function useModelCatalog(provider: Provider) {
  return useQuery({
    queryKey: ['model-catalog', provider],
    queryFn: () => modelService.catalog(provider),
  });
}
