'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useModels } from '@/features/model';
import { getApiErrorMessage } from '@/lib/api';

import { useCreateKnowledgeBase } from '../hooks/useCreateKnowledgeBase';
import { useUpdateKnowledgeBase } from '../hooks/useUpdateKnowledgeBase';
import type { KnowledgeBase } from '../types/knowledge-base.types';

export interface KnowledgeBaseFormProps {
  knowledgeBase?: KnowledgeBase;
  onSuccess?: (knowledgeBase: KnowledgeBase) => void;
}

export function KnowledgeBaseForm({ knowledgeBase, onSuccess }: KnowledgeBaseFormProps) {
  const isEditing = Boolean(knowledgeBase);
  const { data: models } = useModels();
  const embeddingModels = models?.filter((model) => model.is_embedding) ?? [];

  const createKnowledgeBase = useCreateKnowledgeBase();
  const updateKnowledgeBase = useUpdateKnowledgeBase(knowledgeBase?.id ?? Number.NaN);

  const [slug, setSlug] = useState(knowledgeBase?.slug ?? '');
  const [name, setName] = useState(knowledgeBase?.name ?? '');
  const [description, setDescription] = useState(knowledgeBase?.description ?? '');
  const [embeddingModelId, setEmbeddingModelId] = useState(
    knowledgeBase?.embedding_model_id.toString() ?? '',
  );

  useEffect(() => {
    if (!knowledgeBase) return;
    setSlug(knowledgeBase.slug);
    setName(knowledgeBase.name);
    setDescription(knowledgeBase.description ?? '');
    setEmbeddingModelId(knowledgeBase.embedding_model_id.toString());
  }, [knowledgeBase]);

  const mutation = isEditing ? updateKnowledgeBase : createKnowledgeBase;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateKnowledgeBase.mutate(
        { name, description: description || null },
        { onSuccess: (kb) => onSuccess?.(kb) },
      );
      return;
    }
    createKnowledgeBase.mutate(
      {
        slug,
        name,
        description: description || null,
        embedding_model_id: Number(embeddingModelId),
      },
      { onSuccess: (kb) => onSuccess?.(kb) },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={isEditing}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Tên</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Mô tả</Label>
        <Textarea
          id="description"
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="embedding_model_id">Embedding model</Label>
        <Select
          id="embedding_model_id"
          value={embeddingModelId}
          onChange={(e) => setEmbeddingModelId(e.target.value)}
          disabled={isEditing}
          required
        >
          <option value="">— Chọn embedding model —</option>
          {embeddingModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.provider}/{model.model_id})
            </option>
          ))}
        </Select>
        <p className="text-xs text-foreground/60">
          Chỉ hiển thị model có <code>is_embedding: true</code>. Không đổi được sau khi tạo.
        </p>
      </div>

      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {mutation.isPending ? 'Đang lưu…' : isEditing ? 'Lưu' : 'Tạo'}
      </Button>

      {mutation.isError && <p className="text-sm text-red-500">{getApiErrorMessage(mutation.error)}</p>}
      {mutation.isSuccess && isEditing && <p className="text-sm text-green-600">Đã lưu.</p>}
    </form>
  );
}
