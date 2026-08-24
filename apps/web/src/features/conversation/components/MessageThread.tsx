'use client';

import { useEffect, useRef } from 'react';
import { Bot, MessagesSquare, User } from 'lucide-react';

import { cn } from '@/lib/utils';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { useMessages } from '../hooks/useMessages';

interface MessageThreadProps {
  conversationId: number;
  /** Nội dung user vừa gửi, chưa có trong `data` (list message thật chỉ refetch khi có event
   * `done` từ stream — xem `useChatStream`) — render optimistic ngay lúc gửi. */
  pendingUserText?: string | null;
  /** Text model đang stream (tăng dần theo từng `delta`) — rỗng nếu chưa có token nào tới. */
  assistantText?: string;
  /** Tên sub-agent orchestrator đang gọi (giữa `tool_call_start`/`tool_call_end`), `null` nếu
   * không có tool nào đang chạy. */
  toolCallName?: string | null;
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

function TypingDots() {
  return (
    <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-muted px-4 py-3">
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 motion-reduce:animate-none [animation-delay:-0.3s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 motion-reduce:animate-none [animation-delay:-0.15s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 motion-reduce:animate-none" />
    </div>
  );
}

export function MessageThread({
  conversationId,
  pendingUserText,
  assistantText = '',
  toolCallName,
}: MessageThreadProps) {
  const { data, isPending, isError } = useMessages(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [data?.data.length, pendingUserText, assistantText, toolCallName]);

  if (isPending) return <LoadingState label="Đang tải tin nhắn…" />;
  if (isError) return <EmptyState icon={MessagesSquare} tone="destructive" title="Không tải được tin nhắn." />;
  if (data.data.length === 0 && !pendingUserText) {
    return <EmptyState icon={MessagesSquare} title="Chưa có tin nhắn nào" description="Gửi tin nhắn đầu tiên để bắt đầu." />;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-6">
      {data.data.map((message) => (
        <MessageBubble key={message.id} isUser={message.role === 'user'} content={message.content} />
      ))}
      {pendingUserText && (
        <>
          <MessageBubble isUser content={pendingUserText} />
          <div className="flex max-w-[85%] flex-col gap-1.5 self-start">
            <div className="flex gap-2.5">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/70">
                <Bot className="size-3.5" />
              </span>
              {assistantText ? (
                <div className="whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-border bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground">
                  {assistantText}
                </div>
              ) : (
                <TypingDots />
              )}
            </div>
            {toolCallName && (
              <p className="pl-9 text-xs text-muted-foreground">Đang chạy tool: {toolCallName}…</p>
            )}
          </div>
        </>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
