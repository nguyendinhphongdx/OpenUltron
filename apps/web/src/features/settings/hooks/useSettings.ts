'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { settingsService } from '../services/settings.service';
import type { AppSettingsUpdateInput } from '../types/settings.types';

export const SETTINGS_QUERY_KEY = ['settings'] as const;

export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: settingsService.get,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AppSettingsUpdateInput) => settingsService.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
  });
}
