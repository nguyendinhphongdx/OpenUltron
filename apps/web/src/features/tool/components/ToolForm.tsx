'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Globe, Layers, Plug, Settings, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

import { useBuiltinToolCatalog } from '../hooks/useBuiltinToolCatalog';
import { useCreateTool } from '../hooks/useCreateTool';
import { useUpdateTool } from '../hooks/useUpdateTool';
import type {
  HttpToolAiParam,
  HttpToolConfig,
  HttpToolRequest,
  McpToolConfig,
  Tool,
  ToolKind,
} from '../types/tool.types';
import { AiParamFields } from './AiParamFields';
import { HttpRequestFields } from './HttpRequestFields';
import { McpConfigFields } from './McpConfigFields';

const DEFAULT_HTTP_REQUEST: HttpToolRequest = { method: 'GET', url: '', headers: [], query: [], body: null };

const DEFAULT_MCP_CONFIG: McpToolConfig = {
  server: { transport: 'stdio', command: '', args: [] },
  remote_tool_name: '',
};

const KIND_OPTIONS: { kind: ToolKind; label: string; description: string; icon: typeof Zap }[] = [
  { kind: 'builtin', label: 'Builtin', description: 'Chọn từ danh sách tool có sẵn', icon: Zap },
  { kind: 'http', label: 'HTTP Request', description: 'Gọi 1 API bên ngoài qua HTTP request', icon: Globe },
  { kind: 'mcp', label: 'MCP Server', description: 'Kết nối 1 MCP server ngoài', icon: Plug },
];

const KIND_CONFIG_ICON: Record<ToolKind, typeof Zap> = {
  builtin: Zap,
  http: Globe,
  mcp: Plug,
};

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
  const [mcpConfig, setMcpConfig] = useState<McpToolConfig>(
    tool?.kind === 'mcp' && tool.config ? (tool.config as unknown as McpToolConfig) : DEFAULT_MCP_CONFIG,
  );
  const { data: builtinCatalog, isPending: builtinCatalogPending } = useBuiltinToolCatalog();

  const mutation = isEditing ? updateTool : createTool;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let config: Record<string, unknown> | null = null;
    if (kind === 'http') {
      config = { request: httpRequest, ai_params: aiParams } satisfies HttpToolConfig as Record<string, unknown>;
    } else if (kind === 'mcp') {
      config = mcpConfig as unknown as Record<string, unknown>;
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

  const ConfigIcon = KIND_CONFIG_ICON[kind];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Settings className="size-4 text-muted-foreground" />
            Thông tin cơ bản
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Layers className="size-4 text-muted-foreground" />
            Chọn loại tool
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Backend (`ToolService.update`) cho phép đổi `kind` khi update (validate lại config theo
              `kind` cuối cùng) — không khoá card, chỉ cảnh báo rõ để user tự nhập lại cấu hình bên
              dưới cho đúng loại mới. */}
          {isEditing && (
            <p className="mb-3 text-xs text-muted-foreground">
              Đổi loại tool sẽ yêu cầu cấu hình lại phần &quot;Cấu hình&quot; bên dưới cho khớp loại mới.
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {KIND_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = kind === option.kind;
              return (
                <button
                  key={option.kind}
                  type="button"
                  onClick={() => setKind(option.kind)}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border hover:border-primary/40 hover:bg-muted/40',
                  )}
                >
                  <div
                    className={cn(
                      'flex size-8 items-center justify-center rounded-lg',
                      selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ConfigIcon className="size-4 text-muted-foreground" />
            Cấu hình
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {kind === 'builtin' && (
            <div className="flex flex-col gap-2">
              <Label>Builtin tool có sẵn</Label>
              {builtinCatalogPending ? (
                <p className="text-sm text-muted-foreground">Đang tải danh sách…</p>
              ) : !builtinCatalog || builtinCatalog.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có builtin tool nào khả dụng.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {builtinCatalog.map((entry) => {
                      const selected = slug === entry.slug;
                      return (
                        <button
                          key={entry.slug}
                          type="button"
                          disabled={isEditing}
                          onClick={() => {
                            setSlug(entry.slug);
                            if (!description) setDescription(entry.description);
                          }}
                          className={cn(
                            'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60',
                            selected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                              : 'border-border hover:border-primary/40 hover:bg-muted/40',
                          )}
                        >
                          <span className="font-mono text-xs font-medium text-foreground">{entry.slug}</span>
                          <span className="line-clamp-2 text-xs text-muted-foreground">{entry.description}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Slug phải khớp đúng tên trong catalog để agent chạy được (dispatch theo slug,
                    ADR-0013).
                  </p>
                </>
              )}
            </div>
          )}

          {kind === 'http' && (
            <>
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium text-muted-foreground">Request</p>
                <HttpRequestFields value={httpRequest} onChange={setHttpRequest} />
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium text-muted-foreground">Tham số AI điền</p>
                <AiParamFields value={aiParams} onChange={setAiParams} />
              </div>
            </>
          )}

          {kind === 'mcp' && <McpConfigFields value={mcpConfig} onChange={setMcpConfig} />}
        </CardContent>
      </Card>

      <Button type="submit" disabled={mutation.isPending} className="self-start">
        {mutation.isPending ? 'Đang lưu…' : isEditing ? 'Lưu' : 'Tạo tool'}
      </Button>

      {mutation.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(mutation.error)}</p>
      )}
    </form>
  );
}
