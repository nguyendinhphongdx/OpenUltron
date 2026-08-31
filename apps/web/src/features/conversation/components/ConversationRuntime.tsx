'use client';

import { AssistantRuntimeProvider } from '@assistant-ui/react';

import { VoicePanel } from '@/features/voice';

import { ConversationRuntimeSync } from './ConversationRuntimeSync';
import { ConversationShell } from './ConversationShell';
import { MessageComposer } from './MessageComposer';
import { MessageThread } from './MessageThread';
import { PendingFirstMessageSender } from './PendingFirstMessageSender';
import { useAgentChatRuntime } from '../hooks/useAgentChatRuntime';
import type { Message } from '../types/conversation.types';

interface ConversationRuntimeProps {
  conversationId: number;
  persistedMessages: Message[];
}

export function ConversationRuntime({
  conversationId,
  persistedMessages,
}: ConversationRuntimeProps) {
  const { runtime, runtimeError } = useAgentChatRuntime(conversationId, persistedMessages);

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
