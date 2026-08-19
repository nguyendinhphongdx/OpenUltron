/**
 * Khớp `apps/api/app/modules/settings/schemas.py` — đổi shape ở BE thì sửa ở đây,
 * service/hook/component không tự đoán field.
 */

export interface AppSettings {
  default_model_id: number | null;
  default_agent_id: number | null;
  updated_at: string;
}

export type AppSettingsUpdateInput = Partial<Pick<AppSettings, 'default_model_id' | 'default_agent_id'>>;
