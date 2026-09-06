'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { conversationService } from '../services/conversation.service';
import type { ConversationUpdateInput } from '../types/conversation.types';
import { CONVERSATIONS_QUERY_KEY } from './useConversations';

export function useUpdateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ConversationUpdateInput }) =>
      conversationService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
    },
  });
}
