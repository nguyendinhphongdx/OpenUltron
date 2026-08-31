/**
 * Khớp `apps/api/app/modules/tool/schemas.py` — đổi shape ở BE thì sửa ở đây,
 * service/hook/component không tự đoán field.
 */

export type ToolKind = 'builtin' | 'mcp' | 'http';

export interface Tool {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  kind: ToolKind;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Shape của `Tool.config` khi `kind === 'http'` — khớp
 * `docs/adr/0013-tool-execution-builder-registry.md`. `url` phải cố định, KHÔNG chứa
 * placeholder `{{...}}`; placeholder chỉ hợp lệ trong `headers`/`query`/`body`.
 */
export interface HttpKeyValue {
  name: string;
  value: string;
}

export interface HttpToolAiParam {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'json';
}

export interface HttpToolRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers: HttpKeyValue[];
  query: HttpKeyValue[];
  body: Record<string, unknown> | null;
}

export interface HttpToolConfig {
  request: HttpToolRequest;
  ai_params: HttpToolAiParam[];
}

/**
 * Shape của `Tool.config` khi `kind === 'mcp'` — khớp `McpToolConfig`
 * (`apps/api/app/modules/tool/schemas.py`, ADR-0017). `server` là discriminated union theo
 * `transport`: `stdio` (chạy process local qua `command`+`args`) hoặc `http` (gọi thẳng `url`).
 */
export interface McpStdioServerConfig {
  transport: 'stdio';
  command: string;
  args: string[];
}

export interface McpHttpServerConfig {
  transport: 'http';
  url: string;
}

export type McpServerConfig = McpStdioServerConfig | McpHttpServerConfig;

export interface McpToolConfig {
  server: McpServerConfig;
  remote_tool_name: string;
}

export interface ToolCreateInput {
  slug: string;
  name: string;
  description?: string | null;
  kind?: ToolKind;
  config?: Record<string, unknown> | null;
}

export type ToolUpdateInput = Partial<Pick<Tool, 'name' | 'description' | 'kind' | 'config'>>;

/** 1 entry catalog builtin tool (`GET /tools/builtin-catalog`) — khớp
 * `apps/api/app/modules/tool/schemas.py::BuiltinToolCatalogEntry`. */
export interface BuiltinToolCatalogEntry {
  slug: string;
  description: string;
}
