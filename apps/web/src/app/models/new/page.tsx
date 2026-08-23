'use client';

import { useRouter } from 'next/navigation';

import { ModelForm } from '@/features/model/components/ModelForm';
import { useCreateModel } from '@/features/model/hooks/useCreateModel';
import type { ModelCreateInput } from '@/features/model/types/model.types';
import { PageShell } from '@/components/layout/PageShell';

export default function NewModelPage() {
  const router = useRouter();
  const createModel = useCreateModel();

  const handleSubmit = (values: ModelCreateInput) => {
    createModel.mutate(values, {
      onSuccess: (model) => {
        router.push(`/models/${model.id}`);
      },
    });
  };

  return (
    <PageShell title="Model mới">
      <ModelForm
        onSubmit={handleSubmit}
        isPending={createModel.isPending}
        isError={createModel.isError}
        error={createModel.error}
        submitLabel="Tạo"
      />
    </PageShell>
  );
}
