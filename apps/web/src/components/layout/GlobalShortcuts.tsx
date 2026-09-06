'use client';

import { useRouter } from 'next/navigation';

import { useGlobalShortcut } from '@/hooks/useGlobalShortcut';

/** Không render gì — chỉ đăng ký phím tắt toàn app (docs/features/conversation-ux-v2.md).
 * Cmd/Ctrl+K mở hội thoại mới; phím tắt focus ô search nằm cục bộ trong `ConversationList.tsx`
 * (page-scoped, không cần chung ở đây). */
export function GlobalShortcuts() {
  const router = useRouter();
  useGlobalShortcut('k', () => router.push('/conversations/new'));
  return null;
}
