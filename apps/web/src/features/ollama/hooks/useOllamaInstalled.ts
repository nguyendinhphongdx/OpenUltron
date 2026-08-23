'use client';

import { useQuery } from '@tanstack/react-query';

import { ollamaService } from '../services/ollama.service';

export const OLLAMA_INSTALLED_QUERY_KEY = ['ollama-installed'] as const;

export function useOllamaInstalled() {
  return useQuery({
    queryKey: OLLAMA_INSTALLED_QUERY_KEY,
    queryFn: ollamaService.installed,
  });
}
