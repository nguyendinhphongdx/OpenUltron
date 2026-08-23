'use client';

import { useRouter } from 'next/navigation';
import { use } from 'react';
import { Wrench } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/layout/PageShell';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
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
    <PageShell
      title="Sửa tool"
      action={
        <Button size="sm" variant="outline" onClick={handleDelete} disabled={deleteTool.isPending}>
          {deleteTool.isPending ? 'Đang xoá…' : 'Xoá tool'}
        </Button>
      }
    >
      {isPending && <LoadingState label="Đang tải…" />}
      {isError && <EmptyState icon={Wrench} tone="destructive" title="Không tải được tool." />}
      {tool && <ToolForm tool={tool} />}

      {deleteTool.isError && (
        <p className="mt-2 text-sm text-destructive">{getApiErrorMessage(deleteTool.error)}</p>
      )}
    </PageShell>
  );
}
