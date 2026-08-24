'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api';

import { useCreateTool } from '../hooks/useCreateTool';
import { useUpdateTool } from '../hooks/useUpdateTool';
import type { HttpToolAiParam, HttpToolConfig, HttpToolRequest, Tool, ToolKind } from '../types/tool.types';
import { AiParamFields } from './AiParamFields';
import { HttpRequestFields } from './HttpRequestFields';

const TOOL_KINDS: ToolKind[] = ['builtin', 'mcp', 'http'];

const DEFAULT_HTTP_REQUEST: HttpToolRequest = { method: 'GET', url: '', headers: [], query: [], body: null };

function initialHttpRequest(config: Record<string, unknown> | null | undefined): HttpToolRequest {
  const httpConfig = config as HttpToolConfig | null | undefined;
  if (!httpConfig?.request || typeof httpConfig.request !== 'object') return DEFAULT_HTTP_REQUEST;
  const { method, url, headers, query, body } = httpConfig.request;
  return {
    method: method === 'GET' || method === 'POST' || method === 'PUT' || method === 'DELETE' ? method : 'GET',
    url: typeof url === 'string' ? url : '',
    headers: Array.isArray(headers) ? headers : [],
    query: Array.isArray(query) ? query : [],
    body: body && typeof body === 'object' && !Array.isArray(body) ? body : null,
  };
}

function initialAiParams(config: Record<string, unknown> | null | undefined): HttpToolAiParam[] {
  const httpConfig = config as HttpToolConfig | null | undefined;
  return Array.isArray(httpConfig?.ai_params) ? httpConfig.ai_params : [];
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
  const [httpRequest, setHttpRequest] = useState<HttpToolRequest>(initialHttpRequest(tool?.config));
  const [aiParams, setAiParams] = useState<HttpToolAiParam[]>(initialAiParams(tool?.config));

  const mutation = isEditing ? updateTool : createTool;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const config: Record<string, unknown> | null =
      kind === 'http'
        ? ({ request: httpRequest, ai_params: aiParams } satisfies HttpToolConfig as Record<string, unknown>)
        : null;

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
        <Select value={kind} onValueChange={(v) => setKind(v as ToolKind)}>
          <SelectTrigger id="kind" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TOOL_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {kind === 'http' && (
        <>
          <HttpRequestFields value={httpRequest} onChange={setHttpRequest} />
          <AiParamFields value={aiParams} onChange={setAiParams} />
        </>
      )}

      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {mutation.isPending ? 'Đang lưu…' : isEditing ? 'Lưu' : 'Tạo tool'}
      </Button>

      {mutation.isError && (
        <p className="text-sm text-red-500">{getApiErrorMessage(mutation.error)}</p>
      )}
    </form>
  );
}
