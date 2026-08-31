'use client';

import { useRouter } from 'next/navigation';
import { MessageSquarePlus } from 'lucide-react';

import { Button } from '@/components/ui/button';

/** Trước đây mở dialog điền tên hội thoại + chọn agent rồi mới tạo — không ai gõ tên hội thoại tay
 * cả (feedback user). Giờ chỉ điều hướng sang `/conversations/new`: chọn agent trước, khung chat
 * enable sau khi chọn, tiêu đề tự lấy từ tin nhắn đầu tiên khi gửi (`NewConversationView`). */
export function NewConversationButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <Button size="sm" className={className} onClick={() => router.push('/conversations/new')}>
      <MessageSquarePlus />
      Hội thoại mới
    </Button>
  );
}
