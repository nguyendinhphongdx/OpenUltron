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

export interface ToolCreateInput {
  slug: string;
  name: string;
  description?: string | null;
  kind?: ToolKind;
  config?: Record<string, unknown> | null;
}

export type ToolUpdateInput = Partial<Pick<Tool, 'name' | 'description' | 'kind' | 'config'>>;
