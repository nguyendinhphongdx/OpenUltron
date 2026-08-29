'use client';

import { VoicePanel } from '@/features/voice';

import { useChatStream } from '../hooks/useChatStream';
import { ConversationHeader } from './ConversationHeader';
import { MessageComposer } from './MessageComposer';
import { MessageThread } from './MessageThread';

export function ConversationView({ conversationId }: { conversationId: number }) {
  const chat = useChatStream(conversationId);

  return (
    <div className="flex h-screen flex-col overflow-hidden px-3 py-3 sm:px-5">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/72 shadow-[0_24px_80px_rgb(36_38_36/0.08)] backdrop-blur-xl">
        <ConversationHeader conversationId={conversationId} />
        <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgb(255_255_255/0.72),rgb(247_248_246/0.9))]">
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
    </div>
  );
}
