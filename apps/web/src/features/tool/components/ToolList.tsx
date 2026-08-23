'use client';

import Link from 'next/link';
import { Wrench } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { getApiErrorMessage } from '@/lib/api';

import { useDeleteTool } from '../hooks/useDeleteTool';
import { useTools } from '../hooks/useTools';

const KIND_LABEL: Record<string, string> = {
  builtin: 'Builtin',
  mcp: 'MCP',
  http: 'HTTP',
};

export function ToolList() {
  const { data: tools, isPending, isError } = useTools();
  const deleteTool = useDeleteTool();

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

  const handleDelete = (id: number) => {
    if (!window.confirm('Xoá tool này?')) return;
    deleteTool.mutate(id);
  };

  return (
    <div className="space-y-3">
      <Card className="py-0">
        <ul className="divide-y divide-border">
          {tools.map((tool) => (
            <li key={tool.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
              <Link href={`/tools/${tool.id}`} className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span className="truncate">{tool.name}</span>
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs font-normal text-muted-foreground">
                    {KIND_LABEL[tool.kind] ?? tool.kind}
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">{tool.slug}</p>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(tool.id)}
                disabled={deleteTool.isPending}
              >
                Xoá
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      {deleteTool.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(deleteTool.error)}</p>
      )}
    </div>
  );
}
