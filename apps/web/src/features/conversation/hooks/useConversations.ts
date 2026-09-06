'use client';

import { useQuery } from '@tanstack/react-query';
import { conversationService } from '../services/conversation.service';

export const CONVERSATIONS_QUERY_KEY = ['conversations'] as const;

export function useConversations(params?: {
  channel?: string;
  page?: number;
  includeArchived?: boolean;
}) {
  const { includeArchived, ...rest } = params ?? {};
  return useQuery({
    queryKey: [...CONVERSATIONS_QUERY_KEY, { ...rest, includeArchived }],
    queryFn: () =>
      conversationService.list({ ...rest, include_archived: includeArchived }),
  });
}
