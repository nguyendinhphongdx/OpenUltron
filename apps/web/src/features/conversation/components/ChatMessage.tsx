'use client';

import { Bot, User } from 'lucide-react';
import { MessagePartPrimitive, MessagePrimitive } from '@assistant-ui/react';

import { cn } from '@/lib/utils';
import { CitationSources } from './CitationSources';
import { MarkdownTextPart } from './MarkdownTextPart';

function ChatTextParts({ markdown = false }: { markdown?: boolean }) {
  return (
    <MessagePrimitive.Parts
      components={{
        Text: markdown ? MarkdownTextPart : () => (
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

export function UserChatMessage() {
  return (
    <MessagePrimitive.Root className="flex max-w-[88%] flex-row-reverse gap-2.5 self-end">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent shadow-sm">
        <User className="size-3.5" />
      </span>
      <div className="rounded-[1.15rem] rounded-br-md bg-foreground px-4 py-2.5 text-white shadow-sm">
        <ChatTextParts />
      </div>
    </MessagePrimitive.Root>
  );
}

export function AssistantChatMessage() {
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
        <ChatTextParts markdown />
        <CitationSources />
        <MessagePrimitive.Error>
          <p className="text-sm text-destructive">Không chạy được phản hồi này.</p>
        </MessagePrimitive.Error>
      </div>
    </MessagePrimitive.Root>
  );
}
