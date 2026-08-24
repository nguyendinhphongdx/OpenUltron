'use client';

import { useEffect, useRef } from 'react';
import { Bot, MessagesSquare, User } from 'lucide-react';

import { cn } from '@/lib/utils';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { useMessages } from '../hooks/useMessages';

interface MessageThreadProps {
  conversationId: number;
  /** Nội dung user vừa gửi, chưa có trong `data` (list message thật chỉ refetch sau khi cả
   * round-trip xong — xem `useSendMessage`) — render optimistic ngay, kèm bubble "đang trả lời". */
  pendingText?: string | null;
}

function MessageBubble({ isUser, content }: { isUser: boolean; content: string }) {
  return (
    <div className={cn('flex max-w-[85%] gap-2.5', isUser ? 'self-end flex-row-reverse' : 'self-start')}>
      <span
        className={cn(
          'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg',
          isUser ? 'bg-accent/15 text-accent' : 'bg-muted text-foreground/70',
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </span>
      <div
        className={cn(
          'whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'rounded-br-sm bg-accent text-accent-foreground'
            : 'rounded-bl-sm border border-border bg-muted text-foreground',
        )}
      >
        {content}
      </div>
    </div>
  );
}

export function MessageThread({ conversationId, pendingText }: MessageThreadProps) {
  const { data, isPending, isError } = useMessages(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [data?.data.length, pendingText]);

  if (isPending) return <LoadingState label="Đang tải tin nhắn…" />;
  if (isError) return <EmptyState icon={MessagesSquare} tone="destructive" title="Không tải được tin nhắn." />;
  if (data.data.length === 0 && !pendingText) {
    return <EmptyState icon={MessagesSquare} title="Chưa có tin nhắn nào" description="Gửi tin nhắn đầu tiên để bắt đầu." />;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-6">
      {data.data.map((message) => (
        <MessageBubble key={message.id} isUser={message.role === 'user'} content={message.content} />
      ))}
      {pendingText && (
        <>
          <MessageBubble isUser content={pendingText} />
          <div className="flex max-w-[85%] gap-2.5 self-start">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/70">
              <Bot className="size-3.5" />
            </span>
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-muted px-4 py-3">
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 motion-reduce:animate-none [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 motion-reduce:animate-none [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 motion-reduce:animate-none" />
            </div>
          </div>
        </>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
