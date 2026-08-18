'use client';

import { useQuery } from '@tanstack/react-query';
import { conversationService } from '../services/conversation.service';

export const CONVERSATIONS_QUERY_KEY = ['conversations'] as const;

export function useConversations(params?: { channel?: string; page?: number }) {
  return useQuery({
    queryKey: [...CONVERSATIONS_QUERY_KEY, params],
    queryFn: () => conversationService.list(params),
  });
}
