'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Globe, Plug, Wrench, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { getApiErrorMessage } from '@/lib/api';

import { useDeleteTool } from '../hooks/useDeleteTool';
import { useTool } from '../hooks/useTool';
import type { ToolKind } from '../types/tool.types';
import { ToolForm } from './ToolForm';

// Dùng chung cho cả nội dung chính lẫn 2 trạng thái loading/error bên dưới — tránh lặp lỗi mất
// padding khi bỏ `PageShell` (đã fix ở `AgentDetailView.tsx`, xem comment tương ứng ở đó).
const PAGE_CONTAINER_CLASS = 'mx-auto flex min-h-full max-w-3xl flex-col gap-4 px-4 py-5 sm:px-6';

const KIND_ICON: Record<ToolKind, typeof Zap> = {
  builtin: Zap,
  http: Globe,
  mcp: Plug,
};

export function ToolDetailView({ id }: { id: number }) {
  const router = useRouter();

  const { data: tool, isPending, isError } = useTool(id);
  const deleteTool = useDeleteTool();

  if (isPending) {
    return (
      <div className={PAGE_CONTAINER_CLASS}>
        <LoadingState label="Đang tải tool…" />
      </div>
    );
  }
  if (isError || !tool) {
    return (
      <div className={PAGE_CONTAINER_CLASS}>
        <EmptyState icon={Wrench} tone="destructive" title="Không tải được tool." />
      </div>
    );
  }

  const handleDelete = () => {
    if (!window.confirm(`Xoá tool "${tool.name}"? Hành động này không thể hoàn tác.`)) return;
    deleteTool.mutate(id, {
      onSuccess: () => router.push('/tools'),
    });
  };

  const Icon = KIND_ICON[tool.kind];

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/70 px-5 py-4 shadow-sm backdrop-blur-xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/tools')}
          aria-label="Quay lại danh sách tool"
          className="shrink-0"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{tool.name}</h1>
          <p className="truncate font-mono text-xs text-muted-foreground">{tool.slug}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={deleteTool.isPending}
          className="shrink-0 border-destructive text-destructive hover:bg-destructive/10"
        >
          {deleteTool.isPending ? 'Đang xoá…' : 'Xoá tool'}
        </Button>
      </div>

      {deleteTool.isError && (
        <p className="-mt-2 text-sm text-destructive">{getApiErrorMessage(deleteTool.error)}</p>
      )}

      <ToolForm tool={tool} />
    </div>
  );
}
