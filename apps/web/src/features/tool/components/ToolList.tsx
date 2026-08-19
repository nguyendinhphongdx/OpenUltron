'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
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

  if (isPending) return <p className="p-4 text-sm text-foreground/60">Đang tải danh sách tool…</p>;
  if (isError) return <p className="p-4 text-sm text-red-500">Không tải được danh sách tool.</p>;
  if (tools.length === 0) {
    return (
      <p className="p-4 text-sm text-foreground/60">
        Chưa có tool nào. Lưu ý: tool hiện chỉ là metadata quản lý — chưa được gắn vào luồng chat
        thực tế.
      </p>
    );
  }

  const handleDelete = (id: number) => {
    if (!window.confirm('Xoá tool này?')) return;
    deleteTool.mutate(id);
  };

  return (
    <ul className="divide-y divide-border">
      {tools.map((tool) => (
        <li key={tool.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href={`/tools/${tool.id}`} className="flex-1 hover:opacity-80">
            <p className="text-sm font-medium">
              {tool.name}{' '}
              <span className="rounded-full border border-border px-2 py-0.5 text-xs font-normal text-foreground/60">
                {KIND_LABEL[tool.kind] ?? tool.kind}
              </span>
            </p>
            <p className="text-xs text-foreground/60">{tool.slug}</p>
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
      {deleteTool.isError && (
        <li className="px-4 py-2 text-sm text-red-500">{getApiErrorMessage(deleteTool.error)}</li>
      )}
    </ul>
  );
}
