'use client';

import Link from 'next/link';
import { MessagesSquare } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';

import { useConversations } from '../hooks/useConversations';

export function ConversationList() {
  const { data, isPending, isError } = useConversations();

  if (isPending) return <LoadingState label="Đang tải hội thoại…" />;
  if (isError) {
    return <EmptyState icon={MessagesSquare} tone="destructive" title="Không tải được danh sách hội thoại." />;
  }
  if (data.data.length === 0) {
    return (
      <EmptyState
        icon={MessagesSquare}
        title="Chưa có hội thoại nào"
        description="Bắt đầu 1 hội thoại mới để chat với agent."
      />
    );
  }

  return (
    <Card className="py-0">
      <ul className="divide-y divide-border">
        {data.data.map((conversation) => (
          <li key={conversation.id}>
            <Link
              href={`/conversations/${conversation.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {conversation.title ?? `Hội thoại #${conversation.id}`}
                </p>
                <p className="text-xs text-muted-foreground">{conversation.channel}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
