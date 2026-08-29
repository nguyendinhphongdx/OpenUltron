'use client';

import { ArrowUp } from 'lucide-react';
import { ComposerPrimitive } from '@assistant-ui/react';

interface MessageComposerProps {
  error?: string | null;
}

export function MessageComposer({ error }: MessageComposerProps) {
  return (
    <ComposerPrimitive.Root className="border-t border-border/70 bg-white/66 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-end gap-2 rounded-[1.35rem] border border-border bg-white px-2.5 py-2 shadow-[0_10px_34px_rgb(36_38_36/0.08)] transition-colors focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10">
          <ComposerPrimitive.Input
            placeholder="Nhắn gì đó…"
            rows={1}
            submitMode="enter"
            className="max-h-36 min-h-8 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-1.5 text-[15px] leading-6 outline-none placeholder:text-muted-foreground"
          />
          <ComposerPrimitive.Send
            aria-label="Gửi"
            className="mb-0.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-white shadow-sm transition-colors hover:bg-foreground/88 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp className="size-4" />
          </ComposerPrimitive.Send>
        </div>
        <p className="px-2 text-xs text-muted-foreground">
          <kbd className="rounded border border-border bg-background px-1 font-mono text-[11px]">Enter</kbd> để gửi ·{' '}
          <kbd className="rounded border border-border bg-background px-1 font-mono text-[11px]">Shift</kbd>+
          <kbd className="rounded border border-border bg-background px-1 font-mono text-[11px]">Enter</kbd> xuống dòng
        </p>
      </div>
    </ComposerPrimitive.Root>
  );
}
