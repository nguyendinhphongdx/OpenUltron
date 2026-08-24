'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { conversationService } from '../services/conversation.service';

export function useSendMessage(conversationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => conversationService.sendMessage(conversationId, content),
    onSettled: async () => {
      // Invalidate cả khi lỗi — backend lưu user message TRƯỚC khi gọi model (chat/service.py),
      // nên message user vẫn đã tồn tại thật dù model trả lỗi (vd thiếu credential). await để
      // mutation chỉ "settled" ở nơi gọi .mutate() sau khi cache đã có data mới — tránh 1 nhịp
      // flicker mất optimistic bubble trước khi data thật kịp về (xem `MessageComposer`).
      await queryClient.invalidateQueries({ queryKey: ['conversations', conversationId, 'messages'] });
    },
  });
}
