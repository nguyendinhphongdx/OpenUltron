'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import type { McpServerConfig, McpToolConfig } from '../types/tool.types';

interface McpConfigFieldsProps {
  value: McpToolConfig;
  onChange: (v: McpToolConfig) => void;
}

const TRANSPORT_OPTIONS: { transport: McpServerConfig['transport']; label: string; description: string }[] = [
  { transport: 'stdio', label: 'Local process (stdio)', description: 'Chạy 1 lệnh local, giao tiếp qua stdin/stdout' },
  { transport: 'http', label: 'HTTP server', description: 'Gọi thẳng 1 MCP server qua URL' },
];

function updateArg(args: string[], index: number, next: string): string[] {
  return args.map((arg, i) => (i === index ? next : arg));
}

export function McpConfigFields({ value, onChange }: McpConfigFieldsProps) {
  const { server, remote_tool_name } = value;

  const setTransport = (transport: McpServerConfig['transport']) => {
    if (transport === server.transport) return;
    const nextServer: McpServerConfig =
      transport === 'stdio' ? { transport: 'stdio', command: '', args: [] } : { transport: 'http', url: '' };
    onChange({ ...value, server: nextServer });
  };

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-4">
      <div className="flex flex-col gap-1.5">
        <Label>Kiểu kết nối</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TRANSPORT_OPTIONS.map((option) => {
            const selected = server.transport === option.transport;
            return (
              <button
                key={option.transport}
                type="button"
                onClick={() => setTransport(option.transport)}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  selected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border hover:border-primary/40 hover:bg-muted/40',
                )}
              >
                <span className="text-sm font-medium text-foreground">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {server.transport === 'stdio' ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mcp-command">Command</Label>
            <Input
              id="mcp-command"
              value={server.command}
              onChange={(e) => onChange({ ...value, server: { ...server, command: e.target.value } })}
              placeholder="npx"
              className="font-mono text-sm"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Args</Label>
            {server.args.length === 0 && <p className="text-xs text-muted-foreground">Chưa có arg nào.</p>}
            {server.args.map((arg, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={arg}
                  onChange={(e) =>
                    onChange({ ...value, server: { ...server, args: updateArg(server.args, index, e.target.value) } })
                  }
                  placeholder="-y"
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onChange({ ...value, server: { ...server, args: server.args.filter((_, i) => i !== index) } })
                  }
                >
                  Xoá
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => onChange({ ...value, server: { ...server, args: [...server.args, ''] } })}
            >
              + Thêm arg
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mcp-url">URL</Label>
          <Input
            id="mcp-url"
            value={server.url}
            onChange={(e) => onChange({ ...value, server: { ...server, url: e.target.value } })}
            placeholder="https://mcp.example.com"
            className="font-mono text-sm"
            required
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mcp-remote-tool-name">Tool cần gọi trên server</Label>
        <Input
          id="mcp-remote-tool-name"
          value={remote_tool_name}
          onChange={(e) => onChange({ ...value, remote_tool_name: e.target.value })}
          placeholder="tool-name-tren-server"
          className="font-mono text-sm"
          required
        />
        <p className="text-xs text-muted-foreground">
          Ultron tự discover argument schema qua <code className="font-mono">list_tools()</code>, không cần khai
          thêm. Mọi tool <code className="font-mono">kind=mcp</code> bắt buộc chờ duyệt trước khi chạy.
        </p>
      </div>
    </div>
  );
}
