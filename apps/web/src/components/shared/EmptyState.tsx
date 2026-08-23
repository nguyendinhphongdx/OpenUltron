import type { ComponentType, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ComponentType<LucideProps>;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: 'default' | 'destructive';
}

/** Empty/error state dùng chung — thay cho `<p>Đang tải…</p>` rời rạc mỗi feature.
 * Dùng cho cả "chưa có dữ liệu" và "lỗi tải" (đổi `tone`), KHÔNG dùng cho loading — loading dùng
 * `<LoadingState />` (spinner) trong cùng file. */
export function EmptyState({ icon: Icon, title, description, action, tone = 'default' }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center',
        tone === 'destructive' ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/30',
      )}
    >
      {Icon && (
        <div
          className={cn(
            'flex size-10 items-center justify-center rounded-full',
            tone === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="size-5" />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}
