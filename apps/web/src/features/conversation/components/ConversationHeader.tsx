'use client';

import Link from 'next/link';
import { ArrowLeft, Bot, CircleDot } from 'lucide-react';

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
    <div className="flex items-center gap-3 border-b border-border/70 bg-white/66 px-4 py-3 backdrop-blur-xl sm:px-5">
      <Link
        href="/conversations"
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-white/80 text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
            {conversation?.title ?? `Hội thoại #${conversationId}`}
          </h1>
          <span className="hidden items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 sm:inline-flex">
            <CircleDot className="size-3" />
            Live ready
          </span>
        </div>
        {agent ? (
          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5 truncate rounded-full bg-muted px-2 py-0.5">
              <Bot className="size-3" />
              <span className="truncate">{agent.name}</span>
            </span>
            {model && (
              <span className="truncate rounded-full border border-border bg-white/70 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                {model.provider}/{model.model_id}
              </span>
            )}
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">Dùng agent/model mặc định</p>
        )}
      </div>
      <div className="hidden rounded-full border border-border bg-muted/70 px-2.5 py-1 font-mono text-[11px] text-muted-foreground sm:block">
        workspace
      </div>
    </div>
  );
}
