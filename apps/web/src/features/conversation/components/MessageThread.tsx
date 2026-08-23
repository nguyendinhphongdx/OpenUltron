'use client';

import { MessagesSquare } from 'lucide-react';

import { cn } from '@/lib/utils';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { useMessages } from '../hooks/useMessages';

export function MessageThread({ conversationId }: { conversationId: number }) {
  const { data, isPending, isError } = useMessages(conversationId);

  if (isPending) return <LoadingState label="Đang tải tin nhắn…" />;
  if (isError) return <EmptyState icon={MessagesSquare} tone="destructive" title="Không tải được tin nhắn." />;
  if (data.data.length === 0) {
    return <EmptyState icon={MessagesSquare} title="Chưa có tin nhắn nào" description="Gửi tin nhắn đầu tiên để bắt đầu." />;
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {data.data.map((message) => (
        <div
          key={message.id}
          className={cn(
            'max-w-[75%] rounded-lg border border-border px-3 py-2 text-sm',
            message.role === 'user' ? 'self-end bg-accent text-white' : 'self-start bg-muted text-foreground',
          )}
        >
          {message.content}
        </div>
      ))}
    </div>
  );
}
