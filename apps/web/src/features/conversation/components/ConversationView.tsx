'use client';

import { useMemo, useState } from 'react';
import { HttpAgent, type Message as AgUiMessage } from '@ag-ui/client';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useAgUiRuntime } from '@assistant-ui/react-ag-ui';

import { ENV } from '@/constants/env';
import { endpoints } from '@/lib/api';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { VoicePanel } from '@/features/voice';

import { useMessages } from '../hooks/useMessages';
import { ConversationHeader } from './ConversationHeader';
import { MessageComposer } from './MessageComposer';
import { MessageThread } from './MessageThread';
import type { Message } from '../types/conversation.types';

function toAgUiMessage(message: Message): AgUiMessage | null {
  if (message.role !== 'user' && message.role !== 'assistant' && message.role !== 'system') {
    return null;
  }
  return {
    id: String(message.id),
    role: message.role,
    content: message.content,
  };
}

function ConversationRuntime({
  conversationId,
  initialMessages,
}: {
  conversationId: number;
  initialMessages: AgUiMessage[];
}) {
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const agent = useMemo(
    () =>
      new HttpAgent({
        url: `${ENV.apiBaseUrl}${endpoints.conversations.chatAgui(conversationId)}`,
        threadId: String(conversationId),
        agentId: `conversation-${conversationId}`,
        initialMessages,
      }),
    [conversationId, initialMessages],
  );
  const runtime = useAgUiRuntime({
    agent,
    unstable_enableMessageQueue: true,
    onError: (error) => setRuntimeError(error.message),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-screen flex-col overflow-hidden px-3 py-3 sm:px-5">
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/72 shadow-[0_24px_80px_rgb(36_38_36/0.08)] backdrop-blur-xl">
          <ConversationHeader conversationId={conversationId} />
          <MessageThread />
          <VoicePanel conversationId={conversationId} />
          <MessageComposer error={runtimeError} />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}

export function ConversationView({ conversationId }: { conversationId: number }) {
  const { data, isPending, isError } = useMessages(conversationId);

  const initialMessages = useMemo(
    () => data?.data.map(toAgUiMessage).filter((m): m is AgUiMessage => m !== null) ?? [],
    [data?.data],
  );

  if (isPending) {
    return (
      <div className="flex h-screen flex-col overflow-hidden px-3 py-3 sm:px-5">
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/72 shadow-[0_24px_80px_rgb(36_38_36/0.08)] backdrop-blur-xl">
          <ConversationHeader conversationId={conversationId} />
          <LoadingState label="Đang tải hội thoại…" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-screen flex-col overflow-hidden px-3 py-3 sm:px-5">
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/72 shadow-[0_24px_80px_rgb(36_38_36/0.08)] backdrop-blur-xl">
          <ConversationHeader conversationId={conversationId} />
          <EmptyState title="Không tải được hội thoại." tone="destructive" />
        </div>
      </div>
    );
  }

  return (
    <ConversationRuntime
      key={conversationId}
      conversationId={conversationId}
      initialMessages={initialMessages}
    />
  );
}
