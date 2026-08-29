'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Bot,
  CalendarClock,
  MessageSquareText,
  MessagesSquare,
  Search,
  Sparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { NewConversationButton } from './NewConversationButton';
import { useConversations } from '../hooks/useConversations';

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date);
}

export function ConversationList() {
  const { data, isPending, isError } = useConversations();
  const [query, setQuery] = useState('');

  const conversations = useMemo(() => {
    const rows = data?.data ?? [];
    const keyword = query.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((conversation) =>
      `${conversation.title ?? ''} ${conversation.channel} ${conversation.id}`.toLowerCase().includes(keyword),
    );
  }, [data?.data, query]);

  if (isPending) return <LoadingState label="Đang tải hội thoại…" />;
  if (isError) {
    return (
      <EmptyState
        icon={MessagesSquare}
        tone="destructive"
        title="Không tải được danh sách hội thoại."
        description="Kiểm tra API server rồi thử lại."
      />
    );
  }
  if (data.data.length === 0) {
    return (
      <EmptyState
        icon={MessagesSquare}
        title="Chưa có hội thoại nào"
        description="Bắt đầu bằng một agent mặc định, hoặc chọn agent cụ thể ngay từ đầu."
        action={<NewConversationButton />}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 shadow-sm backdrop-blur-xl">
      <div className="flex flex-col gap-4 border-b border-border/70 bg-gradient-to-r from-white/90 to-muted/40 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="h-7 rounded-full bg-white/80 px-3 text-muted-foreground">
            <MessagesSquare className="size-3.5" />
            {data.meta.total} hội thoại
          </Badge>
          <Badge variant="outline" className="h-7 rounded-full bg-white/80 px-3 text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Chat + voice ready
          </Badge>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <div className="relative min-w-0 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên, kênh, ID…"
              className="h-10 rounded-2xl bg-white/85 pl-9"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1.5fr)_140px_150px_120px] border-b border-border/70 bg-muted/30 px-5 py-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground max-lg:hidden">
        <span>Conversation</span>
        <span>Agent</span>
        <span>Updated</span>
        <span className="text-right">Open</span>
      </div>

      {conversations.length === 0 ? (
        <div className="px-5 py-12">
          <EmptyState
            icon={Search}
            title="Không tìm thấy hội thoại phù hợp"
            description="Thử tìm bằng ID, tên hội thoại hoặc kênh khác."
          />
        </div>
      ) : (
        <ul className="divide-y divide-border/70">
          {conversations.map((conversation, index) => {
            const title = conversation.title ?? `Hội thoại #${conversation.id}`;
            return (
              <li key={conversation.id}>
                <Link
                  href={`/conversations/${conversation.id}`}
                  className={cn(
                    'group grid cursor-pointer gap-3 px-5 py-4 transition-colors duration-200 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:grid-cols-[minmax(0,1.5fr)_140px_150px_120px] lg:items-center',
                    index === 0 && 'bg-white/45',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                      <MessageSquareText className="size-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold text-foreground">{title}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>#{conversation.id}</span>
                        <span className="size-1 rounded-full bg-muted-foreground/40" />
                        <span className="capitalize">{conversation.channel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Bot className="size-4" />
                    {conversation.agent_id ? `Agent #${conversation.agent_id}` : 'Default'}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarClock className="size-4" />
                    {formatRelativeDate(conversation.updated_at)}
                  </div>

                  <div className="flex items-center justify-between gap-3 lg:justify-end">
                    <Badge variant="outline" className="rounded-full bg-white/75 text-muted-foreground">
                      Ready
                    </Badge>
                    <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
