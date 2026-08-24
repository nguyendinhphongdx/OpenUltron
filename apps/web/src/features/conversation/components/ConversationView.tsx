'use client';

import { useState } from 'react';

import { ConversationHeader } from './ConversationHeader';
import { MessageComposer } from './MessageComposer';
import { MessageThread } from './MessageThread';

export function ConversationView({ conversationId }: { conversationId: number }) {
  const [pendingText, setPendingText] = useState<string | null>(null);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ConversationHeader conversationId={conversationId} />
      <div className="flex-1 overflow-y-auto">
        <MessageThread conversationId={conversationId} pendingText={pendingText} />
      </div>
      <MessageComposer conversationId={conversationId} onPendingChange={setPendingText} />
    </div>
  );
}
