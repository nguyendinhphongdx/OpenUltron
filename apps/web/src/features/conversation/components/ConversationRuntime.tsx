'use client';

import { useMemo, useState } from 'react';
import { HttpAgent } from '@ag-ui/client';
import {
  AssistantRuntimeProvider,
  fromThreadMessageLike,
  type ThreadHistoryAdapter,
  type ThreadMessageLike,
  type ThreadMessage,
} from '@assistant-ui/react';
import { useAgUiRuntime } from '@assistant-ui/react-ag-ui';

import { ENV } from '@/constants/env';
import { endpoints } from '@/lib/api';
import { VoicePanel } from '@/features/voice';

import { ConversationRuntimeSync } from './ConversationRuntimeSync';
import { ConversationShell } from './ConversationShell';
import { MessageComposer } from './MessageComposer';
import { MessageThread } from './MessageThread';
import { PendingFirstMessageSender } from './PendingFirstMessageSender';
import type { Message } from '../types/conversation.types';

interface ConversationRuntimeProps {
  conversationId: number;
  persistedMessages: Message[];
}

function toThreadMessageLike(message: Message): ThreadMessageLike | null {
  if (message.role !== 'user' && message.role !== 'assistant' && message.role !== 'system') {
    return null;
  }

  return {
    id: String(message.id),
    role: message.role,
    content: message.content ?? '',
    createdAt: new Date(message.created_at),
    metadata: { custom: {} },
    ...(message.role === 'assistant' ? { status: { type: 'complete', reason: 'stop' } as const } : {}),
  };
}

export function ConversationRuntime({
  conversationId,
  persistedMessages,
}: ConversationRuntimeProps) {
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const agent = useMemo(
    () =>
      new HttpAgent({
        url: `${ENV.apiBaseUrl}${endpoints.conversations.chatAgui(conversationId)}`,
        threadId: String(conversationId),
        agentId: `conversation-${conversationId}`,
      }),
    [conversationId],
  );
  const history = useMemo<ThreadHistoryAdapter>(() => {
    const messages = persistedMessages
      .map((message) => {
        const threadMessage = toThreadMessageLike(message);
        if (!threadMessage) return null;
        return fromThreadMessageLike(threadMessage, String(message.id), {
          type: 'complete',
          reason: 'unknown',
        });
      })
      .filter((message): message is ThreadMessage => message !== null);

    return {
      load: async () => ({
        headId: messages.at(-1)?.id ?? null,
        messages: messages.map((message, index) => ({
          parentId: index === 0 ? null : messages[index - 1]?.id ?? null,
          message,
        })),
      }),
      append: async () => undefined,
    };
  }, [persistedMessages]);
  const runtime = useAgUiRuntime({
    agent,
    adapters: { history },
    unstable_enableMessageQueue: true,
    onError: (error) => setRuntimeError(error.message),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ConversationRuntimeSync conversationId={conversationId} />
      <PendingFirstMessageSender conversationId={conversationId} />
      <ConversationShell conversationId={conversationId}>
        <MessageThread />
        <VoicePanel conversationId={conversationId} />
        <MessageComposer error={runtimeError} />
      </ConversationShell>
    </AssistantRuntimeProvider>
  );
}
