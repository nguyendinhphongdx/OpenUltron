'use client';

import { VoicePanel } from '@/features/voice';

import { useChatStream } from '../hooks/useChatStream';
import { ConversationHeader } from './ConversationHeader';
import { MessageComposer } from './MessageComposer';
import { MessageThread } from './MessageThread';

export function ConversationView({ conversationId }: { conversationId: number }) {
  const chat = useChatStream(conversationId);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ConversationHeader conversationId={conversationId} />
      <div className="flex-1 overflow-y-auto">
        <MessageThread
          conversationId={conversationId}
          pendingUserText={chat.pendingUserText}
          assistantText={chat.assistantText}
          toolCallName={chat.toolCallName}
          approvalRequest={chat.approvalRequest}
          onApprove={() => chat.respond('approve')}
          onReject={() => chat.respond('reject')}
        />
      </div>
      <VoicePanel conversationId={conversationId} />
      <MessageComposer
        onSend={chat.send}
        disabled={chat.status === 'streaming' || chat.status === 'awaiting_approval'}
        error={chat.error}
      />
    </div>
  );
}
