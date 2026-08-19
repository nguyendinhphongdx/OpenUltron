'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api';

import { useCreateTool } from '../hooks/useCreateTool';
import { useUpdateTool } from '../hooks/useUpdateTool';
import type { Tool, ToolKind } from '../types/tool.types';

const TOOL_KINDS: ToolKind[] = ['builtin', 'mcp', 'http'];

function stringifyConfig(config: Record<string, unknown> | null): string {
  if (!config) return '';
  return JSON.stringify(config, null, 2);
}

export function ToolForm({ tool }: { tool?: Tool }) {
  const isEditing = Boolean(tool);
  const router = useRouter();
  const createTool = useCreateTool();
  const updateTool = useUpdateTool(tool?.id ?? 0);

  const [slug, setSlug] = useState(tool?.slug ?? '');
  const [name, setName] = useState(tool?.name ?? '');
  const [description, setDescription] = useState(tool?.description ?? '');
  const [kind, setKind] = useState<ToolKind>(tool?.kind ?? 'builtin');
  const [configText, setConfigText] = useState(stringifyConfig(tool?.config ?? null));
  const [configError, setConfigError] = useState<string | null>(null);

  const mutation = isEditing ? updateTool : createTool;

  const parseConfig = (): Record<string, unknown> | null | undefined => {
    const trimmed = configText.trim();
    if (!trimmed) return null;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setConfigError('Config phải là một JSON object.');
        return undefined;
      }
      setConfigError(null);
      return parsed as Record<string, unknown>;
    } catch {
      setConfigError('Config không phải JSON hợp lệ.');
      return undefined;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const config = parseConfig();
    if (config === undefined) return;

    if (isEditing && tool) {
      updateTool.mutate(
        { name, description: description || null, kind, config },
        {
          onSuccess: () => router.push(`/tools/${tool.id}`),
        },
      );
    } else {
      createTool.mutate(
        { slug, name, description: description || null, kind, config },
        {
          onSuccess: (created) => router.push(`/tools/${created.id}`),
        },
      );
    }
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
          placeholder="my-tool"
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
          rows={3}
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kind">Loại</Label>
        <Select id="kind" value={kind} onChange={(e) => setKind(e.target.value as ToolKind)}>
          {TOOL_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="config">Config (JSON)</Label>
        <Textarea
          id="config"
          rows={6}
          className="font-mono text-xs"
          value={configText}
          onChange={(e) => setConfigText(e.target.value)}
          placeholder="{}"
        />
        {configError && <p className="text-xs text-red-500">{configError}</p>}
      </div>

      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {mutation.isPending ? 'Đang lưu…' : isEditing ? 'Lưu' : 'Tạo tool'}
      </Button>

      {mutation.isError && (
        <p className="text-sm text-red-500">{getApiErrorMessage(mutation.error)}</p>
      )}
    </form>
  );
}
