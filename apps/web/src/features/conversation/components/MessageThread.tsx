'use client';

import { MessagesSquare } from 'lucide-react';
import { ThreadPrimitive } from '@assistant-ui/react';

import { EmptyState } from '@/components/shared/EmptyState';
import { ApprovalInterruptPanel } from './ApprovalInterruptPanel';
import { AssistantChatMessage, UserChatMessage } from './ChatMessage';
import { ThinkingIndicator } from './ThinkingIndicator';

interface ThreadMessageLike {
  role: string;
  content?: readonly { type?: string; text?: string }[];
}

function hasRenderableAssistantContent(message: ThreadMessageLike) {
  return (
    message.content?.some((part) => {
      if (part.type === 'text') return Boolean(part.text?.trim());
      return part.type !== 'tool-call';
    }) ?? false
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
          <ThreadPrimitive.Messages>
            {({ message }) => {
              if (message.role === 'user') return <UserChatMessage />;
              if (message.role === 'assistant' && hasRenderableAssistantContent(message)) {
                return <AssistantChatMessage />;
              }
              return null;
            }}
          </ThreadPrimitive.Messages>
          <ApprovalInterruptPanel />
          <ThinkingIndicator />
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}
