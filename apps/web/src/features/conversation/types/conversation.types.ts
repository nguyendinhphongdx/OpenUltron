/**
 * Khớp `apps/api/app/modules/conversation/**\/schemas.py` — đổi shape ở BE thì
 * sửa ở đây, service/hook/component không tự đoán field.
 */

export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface Conversation {
  id: number;
  channel: string;
  external_user_id: string | null;
  agent_id: number | null;
  title: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type ConversationCreateInput = Pick<Conversation, 'channel'> &
  Partial<Pick<Conversation, 'external_user_id' | 'agent_id' | 'title' | 'metadata'>>;

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  id: number;
  conversation_id: number;
  seq: number;
  role: MessageRole;
  content: string;
  tokens_prompt: number | null;
  tokens_completion: number | null;
  cost_usd: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
