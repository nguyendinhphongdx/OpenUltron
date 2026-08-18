'use client';

import { useQuery } from '@tanstack/react-query';
import { conversationService } from '../services/conversation.service';

export function useMessages(conversationId: number) {
  return useQuery({
    queryKey: ['conversations', conversationId, 'messages'],
    queryFn: () => conversationService.listMessages(conversationId),
    enabled: Number.isFinite(conversationId),
  });
}
