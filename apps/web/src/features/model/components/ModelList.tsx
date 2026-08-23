'use client';

import Link from 'next/link';
import { Cpu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { getApiErrorMessage } from '@/lib/api';

import { useDeleteModel } from '../hooks/useDeleteModel';
import { useModels } from '../hooks/useModels';

export function ModelList() {
  const { data: models, isPending, isError } = useModels();
  const deleteModel = useDeleteModel();

  if (isPending) return <LoadingState label="Đang tải model…" />;
  if (isError) return <EmptyState icon={Cpu} tone="destructive" title="Không tải được danh sách model." />;
  if (models.length === 0) {
    return <EmptyState icon={Cpu} title="Chưa có model nào" description="Thêm model đầu tiên để bắt đầu." />;
  }

  const handleDelete = (id: number, name: string) => {
    if (!window.confirm(`Xoá model "${name}"?`)) return;
    deleteModel.mutate(id);
  };

  return (
    <div className="space-y-3">
      <Card className="py-0">
        <ul className="divide-y divide-border">
          {models.map((model) => (
            <li key={model.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
              <Link href={`/models/${model.id}`} className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span className="truncate">{model.name}</span>
                  {model.is_embedding && (
                    <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-normal text-accent">
                      embedding
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {model.slug} · {model.provider}/{model.model_id}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" variant="outline" render={<Link href={`/models/${model.id}`} />}>
                  Sửa
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(model.id, model.name)}
                  disabled={deleteModel.isPending}
                >
                  Xoá
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      {deleteModel.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(deleteModel.error)}</p>
      )}
    </div>
  );
}
