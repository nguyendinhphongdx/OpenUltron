'use client';

import { cn } from '@/lib/utils';
import { useMessages } from '../hooks/useMessages';

export function MessageThread({ conversationId }: { conversationId: number }) {
  const { data, isPending, isError } = useMessages(conversationId);

  if (isPending) return <p className="p-4 text-sm text-foreground/60">Đang tải tin nhắn…</p>;
  if (isError) return <p className="p-4 text-sm text-red-500">Không tải được tin nhắn.</p>;

  return (
    <div className="flex flex-col gap-3 p-4">
      {data.data.map((message) => (
        <div
          key={message.id}
          className={cn(
            'max-w-[75%] rounded-lg border border-border px-3 py-2 text-sm',
            message.role === 'user' ? 'self-end bg-accent text-white' : 'self-start bg-foreground/5',
          )}
        >
          {message.content}
        </div>
      ))}
    </div>
  );
}
