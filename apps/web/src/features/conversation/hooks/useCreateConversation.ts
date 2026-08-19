'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { conversationService } from '../services/conversation.service';
import { CONVERSATIONS_QUERY_KEY } from './useConversations';

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: conversationService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
    },
  });
}
