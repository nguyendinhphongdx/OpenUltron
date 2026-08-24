'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp } from 'lucide-react';

import { getApiErrorMessage } from '@/lib/api';

import { useSendMessage } from '../hooks/useSendMessage';

interface MessageComposerProps {
  conversationId: number;
  /** Cho parent biết nội dung vừa gửi (hoặc `null` khi xong) — `MessageThread` render optimistic
   * bubble ngay khi gửi, vì list message thật chỉ refetch sau khi cả round-trip (kể cả reply)
   * xong (`useSendMessage`), không phải ngay lúc gửi. */
  onPendingChange?: (pendingText: string | null) => void;
}

// Khớp `max-h-36` (144px) ở className textarea — giới hạn cao tối đa trước khi cuộn nội bộ.
const COMPOSER_MAX_HEIGHT_PX = 144;

export function MessageComposer({ conversationId, onPendingChange }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const sendMessage = useSendMessage(conversationId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT_PX)}px`;
  }, [content]);

  const submit = () => {
    const trimmed = content.trim();
    if (!trimmed || sendMessage.isPending) return;
    onPendingChange?.(trimmed);
    setContent('');
    sendMessage.mutate(trimmed, {
      onSettled: () => onPendingChange?.(null),
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        {sendMessage.isError && (
          <p className="text-sm text-destructive">{getApiErrorMessage(sendMessage.error)}</p>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-muted px-4 py-2 focus-within:border-accent">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhắn gì đó…"
            rows={1}
            disabled={sendMessage.isPending}
            className="max-h-36 min-h-6 flex-1 resize-none overflow-y-auto bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={sendMessage.isPending || !content.trim()}
            aria-label="Gửi"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground disabled:opacity-40"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
        <p className="px-1 text-xs text-muted-foreground">
          <kbd className="rounded border border-border bg-background px-1 font-mono text-[11px]">Enter</kbd> để gửi ·{' '}
          <kbd className="rounded border border-border bg-background px-1 font-mono text-[11px]">Shift</kbd>+
          <kbd className="rounded border border-border bg-background px-1 font-mono text-[11px]">Enter</kbd> xuống dòng
        </p>
      </div>
    </form>
  );
}
