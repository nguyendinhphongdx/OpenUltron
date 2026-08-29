'use client';

import { Bot, MessagesSquare, User } from 'lucide-react';
import { MessagePartPrimitive, MessagePrimitive, ThreadPrimitive } from '@assistant-ui/react';

import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';

function TextParts() {
  return (
    <MessagePrimitive.Parts
      components={{
        Text: () => (
          <MessagePartPrimitive.Text
            component="p"
            className="whitespace-pre-wrap text-[15px] leading-relaxed"
            smooth
          />
        ),
      }}
    />
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex max-w-[88%] flex-row-reverse gap-2.5 self-end">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent shadow-sm">
        <User className="size-3.5" />
      </span>
      <div className="rounded-[1.15rem] rounded-br-md bg-foreground px-4 py-2.5 text-white shadow-sm">
        <TextParts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex max-w-[88%] gap-2.5 self-start">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-white/82 text-foreground/70 shadow-sm">
        <Bot className="size-3.5" />
      </span>
      <div
        className={cn(
          'min-w-0 rounded-[1.15rem] rounded-bl-md border border-border bg-white/86 px-4 py-2.5 text-foreground shadow-sm',
          '[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted/60 [&_pre]:p-2',
          '[&_button]:cursor-pointer [&_button]:rounded-full [&_button]:border [&_button]:px-3 [&_button]:py-1.5',
        )}
      >
        <TextParts />
        <MessagePrimitive.Error>
          <p className="text-sm text-destructive">Không chạy được phản hồi này.</p>
        </MessagePrimitive.Error>
      </div>
    </MessagePrimitive.Root>
  );
}

export function MessageThread() {
  return (
    <ThreadPrimitive.Root className="min-h-0 flex-1 overflow-hidden bg-[linear-gradient(180deg,rgb(255_255_255/0.72),rgb(247_248_246/0.9))]">
      <ThreadPrimitive.Viewport
        autoScroll
        className="h-full overflow-y-auto scroll-smooth px-4 py-7 sm:px-6"
      >
        <ThreadPrimitive.Empty>
          <EmptyState
            icon={MessagesSquare}
            title="Chưa có tin nhắn nào"
            description="Gửi tin nhắn đầu tiên để bắt đầu."
          />
        </ThreadPrimitive.Empty>
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage,
            }}
          />
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}
