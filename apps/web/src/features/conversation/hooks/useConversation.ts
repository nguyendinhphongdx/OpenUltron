'use client';

import { useQuery } from '@tanstack/react-query';

import { conversationService } from '../services/conversation.service';

export function conversationQueryKey(id: number) {
  return ['conversations', id] as const;
}

export function useConversation(id: number) {
  return useQuery({
    queryKey: conversationQueryKey(id),
    queryFn: () => conversationService.get(id),
    enabled: Number.isFinite(id),
  });
}
