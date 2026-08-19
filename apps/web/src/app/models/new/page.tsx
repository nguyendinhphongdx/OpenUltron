'use client';

import { useRouter } from 'next/navigation';

import { ModelForm } from '@/features/model/components/ModelForm';
import { useCreateModel } from '@/features/model/hooks/useCreateModel';
import type { ModelCreateInput } from '@/features/model/types/model.types';

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
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-lg font-semibold">Model mới</h1>
      <ModelForm
        onSubmit={handleSubmit}
        isPending={createModel.isPending}
        isError={createModel.isError}
        error={createModel.error}
        submitLabel="Tạo"
      />
    </main>
  );
}
