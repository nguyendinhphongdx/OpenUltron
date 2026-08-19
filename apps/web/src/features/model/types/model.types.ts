/**
 * Khớp `apps/api/app/modules/model/schemas.py` — đổi shape ở BE thì sửa ở đây,
 * service/hook/component không tự đoán field.
 */

export type Provider = 'ollama' | 'gemini' | 'openai' | 'sglang';

export interface Model {
  id: number;
  slug: string;
  name: string;
  provider: Provider;
  model_id: string;
  base_url: string | null;
  is_embedding: boolean;
  extra_config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ModelCreateInput {
  slug: string;
  name: string;
  provider: Provider;
  model_id: string;
  base_url?: string | null;
  is_embedding?: boolean;
  extra_config?: Record<string, unknown> | null;
}

export type ModelUpdateInput = Partial<
  Pick<Model, 'name' | 'provider' | 'model_id' | 'base_url' | 'is_embedding' | 'extra_config'>
>;
