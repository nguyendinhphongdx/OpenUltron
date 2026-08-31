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
import type { CitationSource, Message } from '../types/conversation.types';

interface ConversationRuntimeProps {
  conversationId: number;
  persistedMessages: Message[];
}

function citationSourcesFromMetadata(metadata: Message['metadata']): CitationSource[] {
  const sources = metadata?.sources;
  return Array.isArray(sources) ? (sources as CitationSource[]) : [];
}

function toThreadMessageLike(message: Message): ThreadMessageLike | null {
  if (message.role !== 'user' && message.role !== 'assistant' && message.role !== 'system') {
    return null;
  }

  const sources = citationSourcesFromMetadata(message.metadata);
  // Khôi phục lại đúng `data` part `"kb-sources"` mà lúc stream live AG-UI `CUSTOM` event tạo ra
  // (docs/features/kb-citation.md, `useCitationSources.ts`) — để lịch sử reload sau F5 vẫn hiện
  // citation giống hệt lúc vừa stream xong, cùng 1 chỗ đọc (`useCitationSources`), không phải 2
  // đường dữ liệu khác nhau.
  const content = sources.length > 0
    ? [
        { type: 'text' as const, text: message.content ?? '' },
        { type: 'data' as const, name: 'kb-sources', data: sources },
      ]
    : (message.content ?? '');

  return {
    id: String(message.id),
    role: message.role,
    content,
    createdAt: new Date(message.created_at),
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
