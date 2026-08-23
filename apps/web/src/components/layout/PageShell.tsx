import type { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

// Khung trang chuẩn — routing (app/.../page.tsx) chỉ render 1 View, View dùng cái này làm khung
// ngoài cùng thay vì tự lặp `<main className="mx-auto max-w-2xl">` + header mỗi route.
// Xem docs/conventions/02-frontend-nextjs.md mục "app/ chỉ routing".
export function PageShell({ title, description, action, children }: PageShellProps) {
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="flex-1 px-6 py-6">{children}</div>
    </div>
  );
}
