'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { conversationService } from '../services/conversation.service';

export function useSendMessage(conversationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => conversationService.sendMessage(conversationId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', conversationId, 'messages'] });
    },
  });
}
