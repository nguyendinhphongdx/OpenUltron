import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface PageShellProps {
  title: string;
  description?: string;
  action?: ReactNode;
  maxWidth?: 'default' | 'wide';
  children: ReactNode;
}

// Khung trang chuẩn — routing (app/.../page.tsx) chỉ render 1 View, View dùng cái này làm khung
// ngoài cùng thay vì tự lặp `<main className="mx-auto max-w-2xl">` + header mỗi route.
// Xem docs/conventions/02-frontend-nextjs.md mục "app/ chỉ routing".
export function PageShell({ title, description, action, maxWidth = 'default', children }: PageShellProps) {
  return (
    <div
      className={cn(
        'mx-auto flex min-h-full flex-col px-4 py-5 sm:px-6',
        maxWidth === 'wide' ? 'max-w-7xl' : 'max-w-5xl',
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-4 rounded-2xl border border-white/70 bg-white/70 px-5 py-4 shadow-sm backdrop-blur-xl">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
