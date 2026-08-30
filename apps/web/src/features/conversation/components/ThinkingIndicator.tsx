'use client';

import { Sparkles } from 'lucide-react';
import { useAuiState } from '@assistant-ui/react';

export function ThinkingIndicator() {
  const isRunning = useAuiState((state) => state.thread.isRunning);

  if (!isRunning) return null;

  return (
    <div className="flex max-w-[88%] gap-2.5 self-start" aria-live="polite">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent shadow-sm">
        <Sparkles className="size-3.5" />
      </span>
      <div className="flex items-center gap-2 rounded-[1.15rem] rounded-bl-md border border-border/80 bg-white/88 px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <span>Ultron đang nghĩ</span>
        <span className="flex items-center gap-1" aria-hidden="true">
          <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/55" />
          <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/55 [animation-delay:120ms]" />
          <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/55 [animation-delay:240ms]" />
        </span>
      </div>
    </div>
  );
}
