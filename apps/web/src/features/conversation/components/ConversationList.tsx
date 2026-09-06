'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowUpRight,
  Bot,
  CalendarClock,
  MessageSquareText,
  MessagesSquare,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Search,
  Sparkles,
} from 'lucide-react';

import { useAgents } from '@/features/agent';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

import { NewConversationButton } from './NewConversationButton';
import { useConversations } from '../hooks/useConversations';
import { useUpdateConversation } from '../hooks/useUpdateConversation';
import { groupConversations, type ConversationGroupBy } from '../lib/groupConversations';

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return formatDate(date, { day: '2-digit', month: '2-digit' });
}

export function ConversationList() {
  const [query, setQuery] = useState('');
  const [groupBy, setGroupBy] = useState<ConversationGroupBy>('recency');
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { data, isPending, isError } = useConversations({ includeArchived: showArchived });
  const { data: agents } = useAgents();
  const updateConversation = useUpdateConversation();

  const agentNamesById = useMemo(() => {
    const map = new Map<number, string>();
    for (const agent of agents ?? []) map.set(agent.id, agent.name);
    return map;
  }, [agents]);

  const conversations = useMemo(() => {
    const rows = data?.data ?? [];
    const keyword = query.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((conversation) =>
      `${conversation.title ?? ''} ${conversation.channel} ${conversation.id}`.toLowerCase().includes(keyword),
    );
  }, [data?.data, query]);

  const groups = useMemo(
    () => groupConversations(conversations, groupBy, agentNamesById),
    [conversations, groupBy, agentNamesById],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== '/') return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      event.preventDefault();
      searchInputRef.current?.focus();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const startRename = (id: number, currentTitle: string) => {
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const commitRename = () => {
    if (editingId === null) return;
    const title = editingTitle.trim();
    if (title) updateConversation.mutate({ id: editingId, input: { title } });
    setEditingId(null);
  };

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

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
          <div className="flex items-center gap-1 rounded-full border border-border bg-white/80 p-1 text-xs">
            <button
              type="button"
              onClick={() => setGroupBy('recency')}
              className={cn(
                'cursor-pointer rounded-full px-2.5 py-1 transition-colors',
                groupBy === 'recency' ? 'bg-foreground text-white' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Theo thời gian
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('agent')}
              className={cn(
                'cursor-pointer rounded-full px-2.5 py-1 transition-colors',
                groupBy === 'agent' ? 'bg-foreground text-white' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Theo agent
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowArchived((prev) => !prev)}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-white/80 px-3 py-1.5 text-xs transition-colors',
              showArchived ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Archive className="size-3.5" />
            {showArchived ? 'Đang xem archived' : 'Xem archived'}
          </button>
          <div className="relative min-w-0 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên, kênh, ID… (phím tắt: /)"
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
        groups.map((group) => (
          <div key={group.label}>
            <div className="bg-[#F2F4F1] px-5 py-1.5 text-xs font-medium text-muted-foreground">
              {group.label}
            </div>
            <ul className="divide-y divide-border/70">
              {group.items.map((conversation) => {
                const title = conversation.title ?? `Hội thoại #${conversation.id}`;
                const isEditing = editingId === conversation.id;
                return (
                  <li key={conversation.id}>
                    <Link
                      href={`/conversations/${conversation.id}`}
                      onClick={(event) => {
                        if (isEditing) event.preventDefault();
                      }}
                      className="group grid cursor-pointer gap-3 px-5 py-4 transition-colors duration-200 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:grid-cols-[minmax(0,1.5fr)_140px_150px_120px] lg:items-center"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                          <MessageSquareText className="size-5" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          {isEditing ? (
                            <Input
                              autoFocus
                              value={editingTitle}
                              onChange={(event) => setEditingTitle(event.target.value)}
                              onClick={(event) => event.preventDefault()}
                              onBlur={commitRename}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  commitRename();
                                } else if (event.key === 'Escape') {
                                  event.preventDefault();
                                  setEditingId(null);
                                }
                              }}
                              className="h-7 max-w-56 text-sm"
                            />
                          ) : (
                            <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                              {conversation.pinned && <Pin className="size-3.5 shrink-0 text-primary" />}
                              {title}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>#{conversation.id}</span>
                            <span className="size-1 rounded-full bg-muted-foreground/40" />
                            <span className="capitalize">{conversation.channel}</span>
                            {conversation.archived_at && (
                              <>
                                <span className="size-1 rounded-full bg-muted-foreground/40" />
                                <span>Đã archive</span>
                              </>
                            )}
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

                      <div className="flex items-center justify-between gap-2 lg:justify-end">
                        <Badge variant="outline" className="rounded-full bg-white/75 text-muted-foreground">
                          Ready
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(event: React.MouseEvent) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                }}
                                aria-label={`Thao tác với hội thoại "${title}"`}
                                className="size-7"
                              />
                            }
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            onClick={(event: React.MouseEvent) => event.stopPropagation()}
                          >
                            <DropdownMenuItem
                              onClick={() =>
                                updateConversation.mutate({
                                  id: conversation.id,
                                  input: { pinned: !conversation.pinned },
                                })
                              }
                            >
                              {conversation.pinned ? (
                                <PinOff className="size-4" data-icon="inline-start" />
                              ) : (
                                <Pin className="size-4" data-icon="inline-start" />
                              )}
                              {conversation.pinned ? 'Bỏ pin' : 'Pin'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => startRename(conversation.id, title)}>
                              <Pencil className="size-4" data-icon="inline-start" />
                              Đổi tên
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                updateConversation.mutate({
                                  id: conversation.id,
                                  input: {
                                    archived_at: conversation.archived_at ? null : new Date().toISOString(),
                                  },
                                })
                              }
                            >
                              <Archive className="size-4" data-icon="inline-start" />
                              {conversation.archived_at ? 'Bỏ archive' : 'Archive'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
