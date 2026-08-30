'use client';

import { useQuery } from '@tanstack/react-query';
import { conversationService } from '../services/conversation.service';

// Trần tối đa backend cho phép (`page_size: int = Query(..., le=200)`,
// apps/api/app/modules/conversation/message/router.py). Không gọi mặc định (page_size=50) — hội
// thoại > 50 tin nhắn sẽ chỉ nhận trang 1 (cũ nhất), mất hẳn tin nhắn gần đây khi tải lại trang.
const MESSAGES_PAGE_SIZE = 200;

export const conversationMessagesQueryKey = (conversationId: number) =>
  ['conversations', conversationId, 'messages'] as const;

export function useMessages(conversationId: number) {
  return useQuery({
    queryKey: conversationMessagesQueryKey(conversationId),
    queryFn: async () => {
      const first = await conversationService.listMessages(conversationId, {
        page: 1,
        page_size: MESSAGES_PAGE_SIZE,
      });
      if (first.meta.total_pages <= 1) return first;
      // Backend sort seq.asc() — trang 1 luôn là tin nhắn CŨ NHẤT. Hội thoại dài hơn 1 trang (>200
      // tin nhắn) → lấy lại đúng trang CUỐI để giữ tin nhắn gần đây nhất (LLM context thật vẫn
      // luôn đủ vì ChatService.send dùng message_service.list_all() không giới hạn — đây chỉ là
      // dữ liệu hiển thị UI). Conversation > 200*200 tin nhắn vẫn có thể thiếu đoạn giữa — chưa cần
      // infinite-scroll/cursor cho quy mô hiện tại của Ultron (1 user).
      return conversationService.listMessages(conversationId, {
        page: first.meta.total_pages,
        page_size: MESSAGES_PAGE_SIZE,
      });
    },
    enabled: Number.isFinite(conversationId),
  });
}
