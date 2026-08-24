'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { useAgent } from '@/features/agent';
import { useModel } from '@/features/model';

import { useConversation } from '../hooks/useConversation';

/** Header cho 1 hội thoại — back link + tên agent/model đang trả lời (nếu conversation có gán
 * agent; fallback settings thì không hiện chip, tránh suy đoán sai). */
export function ConversationHeader({ conversationId }: { conversationId: number }) {
  const { data: conversation } = useConversation(conversationId);
  const { data: agent } = useAgent(conversation?.agent_id ?? -1);
  const { data: model } = useModel(agent?.model_id ?? -1);

  return (
    <div className="flex items-center gap-3 border-b border-border px-6 py-4">
      <Link
        href="/conversations"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
      </Link>
      <div className="min-w-0">
        <h1 className="text-base font-semibold tracking-tight text-foreground">
          {conversation?.title ?? `Hội thoại #${conversationId}`}
        </h1>
        {agent && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{agent.name}</span>
            {model && (
              <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                {model.provider}/{model.model_id}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
