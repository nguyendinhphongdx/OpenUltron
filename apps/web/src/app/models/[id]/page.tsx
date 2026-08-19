'use client';

import { useRouter } from 'next/navigation';
import { use } from 'react';

import { Button } from '@/components/ui/button';
import { ModelForm } from '@/features/model/components/ModelForm';
import { useDeleteModel } from '@/features/model/hooks/useDeleteModel';
import { useModel } from '@/features/model/hooks/useModel';
import { useUpdateModel } from '@/features/model/hooks/useUpdateModel';
import type { ModelCreateInput } from '@/features/model/types/model.types';
import { getApiErrorMessage } from '@/lib/api';

export default function ModelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const modelId = Number(id);
  const router = useRouter();

  const { data: model, isPending, isError } = useModel(modelId);
  const updateModel = useUpdateModel(modelId);
  const deleteModel = useDeleteModel();

  const handleSubmit = (values: ModelCreateInput) => {
    updateModel.mutate({
      name: values.name,
      provider: values.provider,
      model_id: values.model_id,
      base_url: values.base_url,
      is_embedding: values.is_embedding,
    });
  };

  const handleDelete = () => {
    if (!model) return;
    if (!window.confirm(`Xoá model "${model.name}"?`)) return;
    deleteModel.mutate(modelId, {
      onSuccess: () => {
        router.push('/models');
      },
    });
  };

  if (isPending) return <p className="p-4 text-sm text-foreground/60">Đang tải model…</p>;
  if (isError || !model) {
    return <p className="p-4 text-sm text-red-500">Không tải được model.</p>;
  }

  return (
    <main className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{model.name}</h1>
        <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleteModel.isPending}>
          Xoá
        </Button>
      </div>

      <ModelForm
        model={model}
        onSubmit={handleSubmit}
        isPending={updateModel.isPending}
        isError={updateModel.isError}
        error={updateModel.error}
        submitLabel="Lưu"
      />

      {deleteModel.isError && (
        <p className="mt-2 text-sm text-red-500">{getApiErrorMessage(deleteModel.error)}</p>
      )}
    </main>
  );
}
