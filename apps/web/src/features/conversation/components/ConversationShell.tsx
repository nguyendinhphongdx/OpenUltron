'use client';

import type { ReactNode } from 'react';

import { ConversationHeader } from './ConversationHeader';

interface ConversationShellProps {
  conversationId: number;
  children: ReactNode;
}

export function ConversationShell({ conversationId, children }: ConversationShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden px-3 py-3 sm:px-5">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/72 shadow-[0_24px_80px_rgb(36_38_36/0.08)] backdrop-blur-xl">
        <ConversationHeader conversationId={conversationId} />
        {children}
      </div>
    </div>
  );
}
