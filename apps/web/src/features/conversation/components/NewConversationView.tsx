'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowUp, Sparkles } from 'lucide-react';

import { useAgents } from '@/features/agent';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api';

import { useCreateConversation } from '../hooks/useCreateConversation';
import { stashPendingFirstMessage } from '../services/pending-first-message';

const TITLE_MAX_LENGTH = 80;

/** Tiêu đề hội thoại tự lấy từ tin nhắn đầu tiên — không có ô nhập tên riêng (không ai dùng, theo
 * feedback user), cắt bớt nếu quá dài thay vì gãy layout list hội thoại. */
function deriveTitle(text: string): string {
  const collapsed = text.trim().replace(/\s+/g, ' ');
  if (collapsed.length <= TITLE_MAX_LENGTH) return collapsed;
  // `Array.from` tách theo code point (không phải UTF-16 code unit như `.slice` trần) — tránh cắt
  // giữa surrogate pair khi ký tự thứ 80 là emoji/ký tự ngoài BMP, ra ký tự vỡ ở đầu list hội
  // thoại (bug thật phát hiện qua code-reviewer).
  const characters = Array.from(collapsed);
  return `${characters.slice(0, TITLE_MAX_LENGTH - 1).join('')}…`;
}

/** Màn `/conversations/new` — chọn agent trước, khung chat chỉ enable sau khi đã chọn (kiểu
 * ChatGPT/ Claude "new chat", không phải form điền tên hội thoại thủ công như trước). Gửi tin nhắn
 * đầu tiên = tạo `Conversation` (title tự set từ chính tin nhắn đó) rồi điều hướng sang
 * `/conversations/{id}`, nơi `PendingFirstMessageSender` tự gửi lại tin nhắn đã gõ — user không gõ
 * lần 2. */
export function NewConversationView() {
  const router = useRouter();
  const { data: agents } = useAgents();
  const createConversation = useCreateConversation();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [text, setText] = useState('');

  const hasAgent = agentId !== null;
  const canSend = hasAgent && text.trim() !== '' && !createConversation.isPending;

  const handleSend = () => {
    if (!canSend) return;
    const trimmed = text.trim();
    createConversation.mutate(
      {
        channel: 'web',
        agent_id: agentId === 'default' ? null : Number(agentId),
        title: deriveTitle(trimmed),
      },
      {
        onSuccess: (conversation) => {
          stashPendingFirstMessage(conversation.id, trimmed);
          router.push(`/conversations/${conversation.id}`);
        },
      },
    );
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden px-3 py-3 sm:px-5">
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/72 shadow-[0_24px_80px_rgb(36_38_36/0.08)] backdrop-blur-xl">
        <div className="flex items-center gap-3 border-b border-border/70 bg-white/66 px-4 py-3 backdrop-blur-xl sm:px-5">
          <Link
            href="/conversations"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-white/80 text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-[15px] font-semibold tracking-tight text-foreground">Hội thoại mới</h1>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </div>
          <div className="w-full max-w-xs space-y-2 text-left">
            <label className="text-xs font-medium text-muted-foreground">Agent trả lời</label>
            <Select value={agentId ?? undefined} onValueChange={(value) => setAgentId(value ?? null)}>
              <SelectTrigger className="h-11 w-full rounded-2xl bg-white/80">
                <SelectValue placeholder="Chọn agent để bắt đầu…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Agent mặc định từ Settings</SelectItem>
                {agents?.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id.toString()}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!hasAgent && <p className="text-xs text-muted-foreground">Chọn agent để bắt đầu nhắn tin.</p>}
        </div>

        <div className="border-t border-border/70 bg-white/66 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            {createConversation.isError && (
              <p className="text-sm text-destructive">{getApiErrorMessage(createConversation.error)}</p>
            )}
            <div className="flex items-end gap-2 rounded-[1.35rem] border border-border bg-white px-2.5 py-2 shadow-[0_10px_34px_rgb(36_38_36/0.08)] transition-colors focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10">
              <Textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                disabled={!hasAgent || createConversation.isPending}
                placeholder={hasAgent ? 'Nhắn gì đó…' : 'Chọn agent để bắt đầu…'}
                rows={1}
                className="max-h-36 min-h-8 flex-1 resize-none overflow-y-auto border-none bg-transparent px-1 py-1.5 text-[15px] leading-6 shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-100"
              />
              <Button
                type="button"
                aria-label="Gửi"
                onClick={handleSend}
                disabled={!canSend}
                size="icon"
                className="mb-0.5 shrink-0 cursor-pointer rounded-full bg-foreground text-white shadow-sm hover:bg-foreground/88 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp className="size-4" />
              </Button>
            </div>
            <p className="px-2 text-xs text-muted-foreground">
              <kbd className="rounded border border-border bg-background px-1 font-mono text-[11px]">Enter</kbd>{' '}
              để gửi ·{' '}
              <kbd className="rounded border border-border bg-background px-1 font-mono text-[11px]">Shift</kbd>+
              <kbd className="rounded border border-border bg-background px-1 font-mono text-[11px]">Enter</kbd>{' '}
              xuống dòng
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
