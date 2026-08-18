/**
 * Endpoint path tập trung — service layer tham chiếu `endpoints.conversations.list`
 * thay vì hardcode string rải rác (đổi 1 chỗ, mọi nơi update theo).
 */
export const endpoints = {
  conversations: {
    list: '/conversations',
    create: '/conversations',
    byId: (id: number) => `/conversations/${id}`,
    messages: (id: number) => `/conversations/${id}/messages`,
  },
} as const;
