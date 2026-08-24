'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api';

import { useBuiltinToolCatalog } from '../hooks/useBuiltinToolCatalog';
import { useCreateTool } from '../hooks/useCreateTool';
import { useUpdateTool } from '../hooks/useUpdateTool';
import type { HttpToolAiParam, HttpToolConfig, HttpToolRequest, Tool, ToolKind } from '../types/tool.types';
import { AiParamFields } from './AiParamFields';
import { HttpRequestFields } from './HttpRequestFields';

const TOOL_KINDS: ToolKind[] = ['builtin', 'mcp', 'http'];

const DEFAULT_HTTP_REQUEST: HttpToolRequest = { method: 'GET', url: '', headers: [], query: [], body: null };

// Placeholder mẫu cho `kind=mcp` — khớp `McpToolConfig` (ADR-0017): `server.transport` là
// "stdio" (command+args) hoặc "http" (url); `remote_tool_name` là tên tool cần gọi trên MCP
// server đó. Chưa có form có cấu trúc riêng (Non-goal của spec) — nhập JSON tay, giống mức độ
// "user tự khai" đã áp dụng cho `kind=http` trước khi có `HttpRequestFields`.
const DEFAULT_MCP_CONFIG_TEXT = JSON.stringify(
  {
    server: { transport: 'stdio', command: 'npx', args: ['-y', 'some-mcp-server'] },
    remote_tool_name: 'tool-name-tren-server',
  },
  null,
  2,
);

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
  const [mcpConfigText, setMcpConfigText] = useState(
    tool?.kind === 'mcp' && tool.config ? JSON.stringify(tool.config, null, 2) : DEFAULT_MCP_CONFIG_TEXT,
  );
  const [mcpConfigError, setMcpConfigError] = useState<string | null>(null);
  const { data: builtinCatalog, isPending: builtinCatalogPending } = useBuiltinToolCatalog();

  const mutation = isEditing ? updateTool : createTool;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let config: Record<string, unknown> | null = null;
    if (kind === 'http') {
      config = { request: httpRequest, ai_params: aiParams } satisfies HttpToolConfig as Record<string, unknown>;
    } else if (kind === 'mcp') {
      try {
        config = JSON.parse(mcpConfigText);
        setMcpConfigError(null);
      } catch {
        setMcpConfigError('JSON không hợp lệ — kiểm tra lại cú pháp.');
        return;
      }
    }

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

      {kind === 'builtin' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="builtin-slug">Builtin tool có sẵn</Label>
          {builtinCatalogPending ? (
            <p className="text-sm text-muted-foreground">Đang tải danh sách…</p>
          ) : !builtinCatalog || builtinCatalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có builtin tool nào khả dụng.</p>
          ) : (
            <>
              <Select
                value={builtinCatalog.some((e) => e.slug === slug) ? slug : undefined}
                onValueChange={(v) => {
                  if (!v) return;
                  setSlug(v);
                  const entry = builtinCatalog.find((e) => e.slug === v);
                  if (entry && !description) setDescription(entry.description);
                }}
                disabled={isEditing}
              >
                <SelectTrigger id="builtin-slug" className="w-full">
                  <SelectValue placeholder="Chọn 1 slug…" />
                </SelectTrigger>
                <SelectContent>
                  {builtinCatalog.map((entry) => (
                    <SelectItem key={entry.slug} value={entry.slug}>
                      {entry.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {builtinCatalog.find((e) => e.slug === slug)?.description ??
                  'Chọn 1 slug ở trên — Slug phải khớp đúng tên trong catalog để agent chạy được (dispatch theo slug, ADR-0013).'}
              </p>
            </>
          )}
        </div>
      )}

      {kind === 'mcp' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mcp-config">Config MCP server (JSON)</Label>
          <Textarea
            id="mcp-config"
            rows={8}
            className="font-mono text-xs"
            value={mcpConfigText}
            onChange={(e) => setMcpConfigText(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            <code className="font-mono">server.transport</code> là <code className="font-mono">&quot;stdio&quot;</code>{' '}
            (command+args) hoặc <code className="font-mono">&quot;http&quot;</code> (url) —{' '}
            <code className="font-mono">remote_tool_name</code> là tên tool cần gọi trên MCP server
            đó (ADR-0017). Ultron tự discover argument schema qua <code className="font-mono">list_tools()</code>,
            không cần khai thêm. Mọi tool <code className="font-mono">kind=mcp</code> bắt buộc chờ
            duyệt trước khi chạy.
          </p>
          {mcpConfigError && <p className="text-sm text-destructive">{mcpConfigError}</p>}
        </div>
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
