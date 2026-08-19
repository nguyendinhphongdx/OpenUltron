'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api';

import type { Model, ModelCreateInput, Provider } from '../types/model.types';

export interface ModelFormValues {
  slug: string;
  name: string;
  provider: Provider;
  model_id: string;
  base_url: string;
  is_embedding: boolean;
}

interface ModelFormProps {
  model?: Model;
  onSubmit: (values: ModelCreateInput) => void;
  isPending?: boolean;
  isError?: boolean;
  error?: unknown;
  submitLabel?: string;
}

export function ModelForm({ model, onSubmit, isPending, isError, error, submitLabel }: ModelFormProps) {
  const isEditing = Boolean(model);

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<Provider>('ollama');
  const [modelId, setModelId] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [isEmbedding, setIsEmbedding] = useState(false);

  useEffect(() => {
    if (!model) return;
    setSlug(model.slug);
    setName(model.name);
    setProvider(model.provider);
    setModelId(model.model_id);
    setBaseUrl(model.base_url ?? '');
    setIsEmbedding(model.is_embedding);
  }, [model]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      slug,
      name,
      provider,
      model_id: modelId,
      base_url: baseUrl || null,
      is_embedding: isEmbedding,
    });
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
        {isEditing && (
          <p className="text-xs text-foreground/60">Slug không thể thay đổi sau khi tạo.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Tên</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="provider">Provider</Label>
        <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
          <SelectTrigger id="provider" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ollama">ollama</SelectItem>
            <SelectItem value="gemini">gemini</SelectItem>
            <SelectItem value="openai">openai</SelectItem>
            <SelectItem value="sglang">sglang</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="model_id">Model ID</Label>
        <Input
          id="model_id"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          placeholder="vd. qwen3.5:4b, gpt-5.5"
          required
        />
        <p className="text-xs text-foreground/60">
          Định danh model của provider — không phải id trong DB.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="base_url">Base URL</Label>
        <Input
          id="base_url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="vd. http://localhost:11434"
        />
        <p className="text-xs text-foreground/60">Bắt buộc với provider ollama/sglang (tự host).</p>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="is_embedding"
          checked={isEmbedding}
          onCheckedChange={(checked) => setIsEmbedding(checked === true)}
        />
        <Label htmlFor="is_embedding" className="font-normal">
          Dùng cho embedding
        </Label>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? 'Đang lưu…' : (submitLabel ?? 'Lưu')}
      </Button>

      {isError && <p className="text-sm text-red-500">{getApiErrorMessage(error)}</p>}
    </form>
  );
}
