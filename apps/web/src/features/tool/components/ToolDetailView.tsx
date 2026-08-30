'use client';

import { useRouter } from 'next/navigation';
import { Wrench } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/layout/PageShell';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { getApiErrorMessage } from '@/lib/api';

import { useDeleteTool } from '../hooks/useDeleteTool';
import { useTool } from '../hooks/useTool';
import { ToolForm } from './ToolForm';

export function ToolDetailView({ id }: { id: number }) {
  const router = useRouter();

  const { data: tool, isPending, isError } = useTool(id);
  const deleteTool = useDeleteTool();

  const handleDelete = () => {
    if (!window.confirm('Xoá tool này?')) return;
    deleteTool.mutate(id, {
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
