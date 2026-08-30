'use client';

import { EmptyState, LoadingState } from '@/components/shared/EmptyState';

import { useMessages } from '../hooks/useMessages';
import { ConversationRuntime } from './ConversationRuntime';
import { ConversationShell } from './ConversationShell';

export function ConversationView({ conversationId }: { conversationId: number }) {
  const { data, isPending, isError } = useMessages(conversationId);

  if (isPending) {
    return (
      <ConversationShell conversationId={conversationId}>
        <LoadingState label="Đang tải hội thoại…" />
      </ConversationShell>
    );
  }

  if (isError) {
    return (
      <ConversationShell conversationId={conversationId}>
        <EmptyState title="Không tải được hội thoại." tone="destructive" />
      </ConversationShell>
    );
  }

  return (
    <ConversationRuntime
      key={conversationId}
      conversationId={conversationId}
      persistedMessages={data?.data ?? []}
    />
  );
}
