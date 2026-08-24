'use client';

import { useRouter } from 'next/navigation';

import { useCreateModel } from '../hooks/useCreateModel';
import type { ModelCreateInput, Provider } from '../types/model.types';
import { ModelForm } from './ModelForm';

interface NewModelViewProps {
  /** Giá trị nháp từ query string (vd mở từ `ModelCatalogPanel`/`OllamaCatalogPanel` — "Dùng
   * model này") — `app/models/new/page.tsx` chỉ đọc `searchParams` rồi truyền xuống, không xử lý
   * logic (docs/conventions/02-frontend-nextjs.md, "app/ chỉ routing"). */
  initial?: { provider?: string; model_id?: string; name?: string };
}

export function NewModelView({ initial }: NewModelViewProps) {
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
    <ModelForm
      initial={{
        provider: initial?.provider as Provider | undefined,
        model_id: initial?.model_id,
        name: initial?.name,
      }}
      onSubmit={handleSubmit}
      isPending={createModel.isPending}
      isError={createModel.isError}
      error={createModel.error}
      submitLabel="Tạo"
    />
  );
}
