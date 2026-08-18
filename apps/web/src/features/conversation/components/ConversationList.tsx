'use client';

import Link from 'next/link';

import { useConversations } from '../hooks/useConversations';

export function ConversationList() {
  const { data, isPending, isError } = useConversations();

  if (isPending) return <p className="p-4 text-sm text-foreground/60">Đang tải hội thoại…</p>;
  if (isError) return <p className="p-4 text-sm text-red-500">Không tải được danh sách hội thoại.</p>;
  if (data.data.length === 0) {
    return <p className="p-4 text-sm text-foreground/60">Chưa có hội thoại nào.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {data.data.map((conversation) => (
        <li key={conversation.id}>
          <Link
            href={`/conversations/${conversation.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-foreground/5"
          >
            <div>
              <p className="text-sm font-medium">{conversation.title ?? `Hội thoại #${conversation.id}`}</p>
              <p className="text-xs text-foreground/60">{conversation.channel}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
