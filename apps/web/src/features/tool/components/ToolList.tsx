'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Globe, Plug, Trash2, Wrench, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

import { useDeleteTool } from '../hooks/useDeleteTool';
import { useTools } from '../hooks/useTools';
import type { Tool, ToolKind } from '../types/tool.types';

const KIND_LABEL: Record<ToolKind, string> = {
  builtin: 'Builtin',
  mcp: 'MCP',
  http: 'HTTP',
};

const KIND_ICON: Record<ToolKind, typeof Zap> = {
  builtin: Zap,
  http: Globe,
  mcp: Plug,
};

// Token màu đã có trong theme (--accent/--primary/--secondary) — không tự đặt hex mới
// (09-ui-visual-design.md).
const KIND_CHIP_CLASS: Record<ToolKind, string> = {
  builtin: 'bg-accent/10 text-accent',
  http: 'bg-primary/10 text-primary',
  mcp: 'bg-secondary text-secondary-foreground',
};

type FilterKind = 'all' | ToolKind;

const FILTER_TABS: { value: FilterKind; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'builtin', label: 'Builtin' },
  { value: 'http', label: 'HTTP' },
  { value: 'mcp', label: 'MCP' },
];

function ToolCard({ tool, onDelete, isDeleting }: { tool: Tool; onDelete: (id: number) => void; isDeleting: boolean }) {
  const Icon = KIND_ICON[tool.kind];
  return (
    <Card className="group relative gap-2 border-white/70 bg-white/70 py-4 backdrop-blur-xl transition-colors hover:border-primary/40 hover:shadow-md">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(tool.id);
        }}
        disabled={isDeleting}
        aria-label={`Xoá tool ${tool.name}`}
        className="absolute right-3 top-3 z-10 flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
      <Link href={`/tools/${tool.id}`} className="flex flex-col gap-3 px-4">
        <div className="flex items-center gap-2.5">
          <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', KIND_CHIP_CLASS[tool.kind])}>
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <p className="truncate text-sm font-medium text-foreground">{tool.name}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{tool.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{KIND_LABEL[tool.kind]}</Badge>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {tool.description || 'Chưa có mô tả.'}
        </p>
      </Link>
    </Card>
  );
}

export function ToolList() {
  const { data: tools, isPending, isError } = useTools();
  const deleteTool = useDeleteTool();
  const [activeKind, setActiveKind] = useState<FilterKind>('all');

  if (isPending) return <LoadingState label="Đang tải danh sách tool…" />;
  if (isError) return <EmptyState icon={Wrench} tone="destructive" title="Không tải được danh sách tool." />;
  if (tools.length === 0) {
    return (
      <EmptyState
        icon={Wrench}
        title="Chưa có tool nào"
        description="Lưu ý: tool hiện chỉ là metadata quản lý — chưa được gắn vào luồng chat thực tế."
      />
    );
  }

  const filteredTools = activeKind === 'all' ? tools : tools.filter((t) => t.kind === activeKind);

  const handleDelete = (id: number) => {
    if (!window.confirm('Xoá tool này?')) return;
    deleteTool.mutate(id);
  };

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={activeKind} onValueChange={(v) => setActiveKind(v as FilterKind)}>
        <TabsList>
          {FILTER_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filteredTools.length === 0 ? (
        <EmptyState icon={Wrench} title="Không có tool nào khớp bộ lọc" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onDelete={handleDelete} isDeleting={deleteTool.isPending} />
          ))}
        </div>
      )}

      {deleteTool.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(deleteTool.error)}</p>
      )}
    </div>
  );
}
