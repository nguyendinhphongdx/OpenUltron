'use client';

import { useRouter } from 'next/navigation';
import { Cpu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/layout/PageShell';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { getApiErrorMessage } from '@/lib/api';

import { useDeleteModel } from '../hooks/useDeleteModel';
import { useModel } from '../hooks/useModel';
import { useUpdateModel } from '../hooks/useUpdateModel';
import type { ModelCreateInput } from '../types/model.types';
import { ModelForm } from './ModelForm';

export function ModelDetailView({ id }: { id: number }) {
  const router = useRouter();

  const { data: model, isPending, isError } = useModel(id);
  const updateModel = useUpdateModel(id);
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
    deleteModel.mutate(id, {
      onSuccess: () => {
        router.push('/models');
      },
    });
  };

  if (isPending) {
    return (
      <PageShell title={`Model #${id}`}>
        <LoadingState label="Đang tải model…" />
      </PageShell>
    );
  }
  if (isError || !model) {
    return (
      <PageShell title={`Model #${id}`}>
        <EmptyState icon={Cpu} tone="destructive" title="Không tải được model." />
      </PageShell>
    );
  }

  return (
    <PageShell
      title={model.name}
      action={
        <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleteModel.isPending}>
          Xoá
        </Button>
      }
    >
      <ModelForm
        model={model}
        onSubmit={handleSubmit}
        isPending={updateModel.isPending}
        isError={updateModel.isError}
        error={updateModel.error}
        submitLabel="Lưu"
      />

      {deleteModel.isError && (
        <p className="mt-2 text-sm text-destructive">{getApiErrorMessage(deleteModel.error)}</p>
      )}
    </PageShell>
  );
}
