'use client';

import { useEffect, useRef } from 'react';
import { Bot, MessagesSquare, User } from 'lucide-react';

import { cn } from '@/lib/utils';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { useMessages } from '../hooks/useMessages';
import type { ApprovalRequest } from '../hooks/useChatStream';

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
  /** Tool đang chờ duyệt (approval gate, ADR-0014) — `null` khi không có gì chờ. */
  approvalRequest?: ApprovalRequest | null;
  onApprove?: () => void;
  onReject?: () => void;
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
  approvalRequest,
  onApprove,
  onReject,
}: MessageThreadProps) {
  const { data, isPending, isError } = useMessages(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [data?.data.length, pendingUserText, assistantText, toolCallName, approvalRequest]);

  if (isPending) return <LoadingState label="Đang tải tin nhắn…" />;
  if (isError) return <EmptyState icon={MessagesSquare} tone="destructive" title="Không tải được tin nhắn." />;
  if (data.data.length === 0 && !pendingUserText) {
    return <EmptyState icon={MessagesSquare} title="Chưa có tin nhắn nào" description="Gửi tin nhắn đầu tiên để bắt đầu." />;
  }

  // Turn đang chờ (streaming/awaiting_approval) có thể mất nhiều giây/phút — nếu react-query
  // refetch `messages` trong lúc đó (background refetch, không phải do `done`), message user vừa
  // gửi đã thật sự persist ở BE ngay từ đầu (trước khi model chạy) nên có thể đã xuất hiện trong
  // `data.data` — không render optimistic bubble trùng lặp nữa trong trường hợp đó.
  const lastMessage = data.data[data.data.length - 1];
  const alreadyPersisted =
    lastMessage?.role === 'user' && lastMessage.content === pendingUserText;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-6">
      {data.data.map((message) => (
        <MessageBubble key={message.id} isUser={message.role === 'user'} content={message.content} />
      ))}
      {pendingUserText && (
        <>
          {!alreadyPersisted && <MessageBubble isUser content={pendingUserText} />}
          <div className="flex max-w-[85%] flex-col gap-1.5 self-start">
            <div className="flex gap-2.5">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/70">
                <Bot className="size-3.5" />
              </span>
              {approvalRequest ? (
                <div className="flex flex-col gap-2.5 rounded-2xl rounded-bl-sm border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950">
                  <p className="font-medium text-foreground">
                    Cần duyệt trước khi chạy tool <code className="font-mono">{approvalRequest.toolName}</code>
                  </p>
                  <pre className="overflow-x-auto rounded-md bg-background/60 p-2 font-mono text-xs text-muted-foreground">
                    {JSON.stringify(approvalRequest.arguments, null, 2)}
                  </pre>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onApprove}
                      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      onClick={onReject}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              ) : assistantText ? (
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
