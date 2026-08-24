'use client';

import { useQuery } from '@tanstack/react-query';

import { toolService } from '../services/tool.service';

export function useBuiltinToolCatalog() {
  return useQuery({
    queryKey: ['tools', 'builtin-catalog'],
    queryFn: toolService.builtinCatalog,
  });
}
