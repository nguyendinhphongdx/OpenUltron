'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api';

import { useDeleteModel } from '../hooks/useDeleteModel';
import { useModels } from '../hooks/useModels';

export function ModelList() {
  const { data: models, isPending, isError } = useModels();
  const deleteModel = useDeleteModel();

  if (isPending) return <p className="p-4 text-sm text-foreground/60">Đang tải model…</p>;
  if (isError) return <p className="p-4 text-sm text-red-500">Không tải được danh sách model.</p>;
  if (models.length === 0) {
    return <p className="p-4 text-sm text-foreground/60">Chưa có model nào.</p>;
  }

  const handleDelete = (id: number, name: string) => {
    if (!window.confirm(`Xoá model "${name}"?`)) return;
    deleteModel.mutate(id);
  };

  return (
    <div>
      <ul className="divide-y divide-border">
        {models.map((model) => (
          <li key={model.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-foreground/5">
            <Link href={`/models/${model.id}`} className="flex-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                {model.name}
                {model.is_embedding && (
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-normal text-accent">
                    embedding
                  </span>
                )}
              </p>
              <p className="text-xs text-foreground/60">
                {model.slug} · {model.provider}/{model.model_id}
              </p>
            </Link>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/models/${model.id}`}>Sửa</Link>
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
      {deleteModel.isError && (
        <p className="px-4 py-2 text-sm text-red-500">{getApiErrorMessage(deleteModel.error)}</p>
      )}
    </div>
  );
}
