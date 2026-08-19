'use client';

import { useRouter } from 'next/navigation';
import { use } from 'react';

import { Button } from '@/components/ui/button';
import { ToolForm } from '@/features/tool/components/ToolForm';
import { useDeleteTool } from '@/features/tool/hooks/useDeleteTool';
import { useTool } from '@/features/tool/hooks/useTool';
import { getApiErrorMessage } from '@/lib/api';

export default function ToolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toolId = Number(id);
  const router = useRouter();

  const { data: tool, isPending, isError } = useTool(toolId);
  const deleteTool = useDeleteTool();

  const handleDelete = () => {
    if (!window.confirm('Xoá tool này?')) return;
    deleteTool.mutate(toolId, {
      onSuccess: () => router.push('/tools'),
    });
  };

  return (
    <main className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Sửa tool</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDelete}
          disabled={deleteTool.isPending}
        >
          {deleteTool.isPending ? 'Đang xoá…' : 'Xoá tool'}
        </Button>
      </div>

      {isPending && <p className="text-sm text-foreground/60">Đang tải…</p>}
      {isError && <p className="text-sm text-red-500">Không tải được tool.</p>}
      {tool && <ToolForm tool={tool} />}

      {deleteTool.isError && (
        <p className="mt-2 text-sm text-red-500">{getApiErrorMessage(deleteTool.error)}</p>
      )}
    </main>
  );
}
