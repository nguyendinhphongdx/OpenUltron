'use client';

import { useState } from 'react';

import { ConversationHeader } from './ConversationHeader';
import { MessageComposer } from './MessageComposer';
import { MessageThread } from './MessageThread';

export function ConversationView({ conversationId }: { conversationId: number }) {
  const [isAwaitingReply, setIsAwaitingReply] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ConversationHeader conversationId={conversationId} />
      <div className="flex-1 overflow-y-auto">
        <MessageThread conversationId={conversationId} isAwaitingReply={isAwaitingReply} />
      </div>
      <MessageComposer conversationId={conversationId} onPendingChange={setIsAwaitingReply} />
    </div>
  );
}
