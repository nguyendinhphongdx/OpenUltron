'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api';
import { useOllamaInstalled } from '@/features/ollama';

import { useModelCatalog } from '../hooks/useModelCatalog';
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
  /** Giá trị nháp khi tạo mới (vd từ catalog — `ModelCatalogPanel`) — không áp dụng khi `model`
   * có giá trị (chế độ edit luôn ưu tiên dữ liệu thật của `model`). */
  initial?: Partial<Pick<ModelFormValues, 'provider' | 'model_id' | 'name'>>;
  onSubmit: (values: ModelCreateInput) => void;
  isPending?: boolean;
  isError?: boolean;
  error?: unknown;
  submitLabel?: string;
}

export function ModelForm({
  model,
  initial,
  onSubmit,
  isPending,
  isError,
  error,
  submitLabel,
}: ModelFormProps) {
  const isEditing = Boolean(model);

  const [slug, setSlug] = useState('');
  const [name, setName] = useState(initial?.name ?? '');
  const [provider, setProvider] = useState<Provider>(initial?.provider ?? 'ollama');
  const [modelId, setModelId] = useState(initial?.model_id ?? '');
  const [baseUrl, setBaseUrl] = useState('');
  const [isEmbedding, setIsEmbedding] = useState(false);

  // Gợi ý Model ID theo provider đang chọn — datalist (HTML thuần, vẫn gõ tay tự do được, không
  // cần combobox component riêng): gemini/openai lấy từ catalog tĩnh (ADR-0010), ollama lấy từ
  // model đã pull thật trên máy (ADR-0011) — 2 nguồn khác nhau, không có catalog cứng cho sglang
  // (self-host, model tuỳ người dùng tự serve).
  const { data: catalog } = useModelCatalog(provider);
  const { data: installed } = useOllamaInstalled();
  const modelIdSuggestions =
    provider === 'ollama'
      ? (installed ?? []).map((m) => ({ model_id: m.name, label: m.name }))
      : (catalog ?? []).map((c) => ({ model_id: c.model_id, label: c.label }));

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
          list="model-id-suggestions"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          placeholder={provider === 'sglang' ? 'model tự host, xem SGLang server' : 'gõ hoặc chọn gợi ý bên dưới'}
          required
        />
        <datalist id="model-id-suggestions">
          {modelIdSuggestions.map((s) => (
            <option key={s.model_id} value={s.model_id}>
              {s.label}
            </option>
          ))}
        </datalist>
        <p className="text-xs text-foreground/60">
          Định danh model của provider — không phải id trong DB.{' '}
          {provider === 'ollama'
            ? 'Gợi ý lấy từ model đã pull thật trên máy.'
            : provider !== 'sglang' && 'Gợi ý lấy từ catalog — vẫn gõ tay được nếu model chưa có trong catalog.'}
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
