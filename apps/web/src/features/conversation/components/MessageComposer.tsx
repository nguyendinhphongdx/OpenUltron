'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp } from 'lucide-react';

interface MessageComposerProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  error?: string | null;
}

// Khớp `max-h-36` (144px) ở className textarea — giới hạn cao tối đa trước khi cuộn nội bộ.
const COMPOSER_MAX_HEIGHT_PX = 144;

export function MessageComposer({ onSend, disabled, error }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT_PX)}px`;
  }, [content]);

  const submit = () => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;
    setContent('');
    onSend(trimmed);
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
    <form onSubmit={handleSubmit} className="border-t border-border/70 bg-white/66 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-end gap-2 rounded-[1.35rem] border border-border bg-white px-2.5 py-2 shadow-[0_10px_34px_rgb(36_38_36/0.08)] transition-colors focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhắn gì đó…"
            rows={1}
            disabled={disabled}
            className="max-h-36 min-h-8 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-1.5 text-[15px] leading-6 outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={disabled || !content.trim()}
            aria-label="Gửi"
            className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-white shadow-sm transition-colors hover:bg-foreground/88 disabled:opacity-40"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
        <p className="px-2 text-xs text-muted-foreground">
          <kbd className="rounded border border-border bg-background px-1 font-mono text-[11px]">Enter</kbd> để gửi ·{' '}
          <kbd className="rounded border border-border bg-background px-1 font-mono text-[11px]">Shift</kbd>+
          <kbd className="rounded border border-border bg-background px-1 font-mono text-[11px]">Enter</kbd> xuống dòng
        </p>
      </div>
    </form>
  );
}
