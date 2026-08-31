'use client';

import { useMutation } from '@tanstack/react-query';

import { conversationService, type Conversation } from '@/features/conversation';

/** Tạo 1 `Conversation` thật gắn với `rootAgentId` cho panel "Chạy thử" (Orchestrator v2 Phase D,
 * docs/features/orchestrator-v2.md) — tái dùng thẳng `conversationService.create` đã có, không
 * thêm gì mới ở service layer. `channel: 'orchestrator-simulator'` chỉ để phân biệt nguồn gốc lúc
 * xem lại danh sách hội thoại, không có logic riêng nào rẽ nhánh theo channel này. */
export function useCreateSimulatorConversation(rootAgentId: number) {
  return useMutation({
    mutationFn: (): Promise<Conversation> =>
      conversationService.create({ channel: 'orchestrator-simulator', agent_id: rootAgentId }),
  });
}
