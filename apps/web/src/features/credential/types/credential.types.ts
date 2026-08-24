/**
 * Khớp `apps/api/app/modules/credential/schemas.py` — đổi shape ở BE thì sửa ở đây.
 * 1 credential/provider (ADR-0010) — không có field `name`, không có nhiều bản/provider.
 * "github" là connector provider (ADR-0015), không phải model provider — nhưng tái dùng nguyên
 * credential store/UI này.
 */

export type CredentialProvider = 'gemini' | 'openai' | 'github';

export interface Credential {
  id: string;
  provider: CredentialProvider;
  masked_key: string;
  is_valid: boolean;
  created_at: string;
  updated_at: string;
}

export interface CredentialUpsertInput {
  api_key: string;
}
