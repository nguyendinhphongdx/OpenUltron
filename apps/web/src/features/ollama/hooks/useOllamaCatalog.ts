'use client';

import { useQuery } from '@tanstack/react-query';

import { ollamaService } from '../services/ollama.service';

export function useOllamaCatalog() {
  return useQuery({
    queryKey: ['ollama-catalog'],
    queryFn: ollamaService.catalog,
  });
}
