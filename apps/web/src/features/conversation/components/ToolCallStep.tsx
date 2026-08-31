'use client';

import { Wrench } from 'lucide-react';
import type { ToolCallMessagePartComponent } from '@assistant-ui/react';

import { cn } from '@/lib/utils';

function formatArgs(args: unknown): string {
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}

/**
 * Hiện 1 bước gọi tool trong turn (docs/features/agent-execution-trace.md) — đăng ký làm
 * `components.tools.Fallback` trong `ChatMessage.tsx`, áp dụng cho MỌI tool-call part bất kể tên
 * tool. Vị trí trong `content` array đã đúng thứ tự chronological (AG-UI run-aggregator giữ
 * nguyên) nên không cần tự sắp xếp — chỉ hiện xen kẽ với text part.
 */
export const ToolCallStep: ToolCallMessagePartComponent = ({ toolName, args, result, isError }) => {
  const hasResult = result !== undefined;

  return (
    <details
      className={cn(
        'my-1.5 rounded-xl border bg-muted/30 text-xs',
        isError ? 'border-destructive/40' : 'border-border/70',
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 font-medium text-muted-foreground marker:hidden">
        <Wrench className="size-3.5 shrink-0" />
        <span className="truncate font-mono">{toolName}</span>
        {!hasResult && <span className="text-muted-foreground/70">đang chạy…</span>}
      </summary>
      <div className="flex flex-col gap-2 border-t border-border/60 px-3 py-2.5">
        <div>
          <p className="mb-1 font-medium text-muted-foreground">Tham số</p>
          <pre className="overflow-x-auto rounded-md bg-background/60 p-2 font-mono">
            {formatArgs(args)}
          </pre>
        </div>
        {hasResult && (
          <div>
            <p className={cn('mb-1 font-medium', isError ? 'text-destructive' : 'text-muted-foreground')}>
              {isError ? 'Lỗi' : 'Kết quả'}
            </p>
            <pre className="overflow-x-auto rounded-md bg-background/60 p-2 font-mono whitespace-pre-wrap">
              {String(result)}
            </pre>
          </div>
        )}
      </div>
    </details>
  );
};
