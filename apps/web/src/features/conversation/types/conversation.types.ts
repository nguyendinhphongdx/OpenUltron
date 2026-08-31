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

/**
 * 1 chunk KB đã được agent retrieve trong turn sinh ra message này — nằm ở
 * `Message.metadata.sources` (docs/features/kb-citation.md). `id` là số thứ tự trong TURN đó
 * (không phải id thật trong DB), khớp tag `<source id="N">` model thấy trong context và cú pháp
 * cite `[cite:N]` model chèn vào text trả lời — không đảm bảo tồn tại nếu model tự bịa số ngoài
 * range, nơi dùng phải tự kiểm tra trước khi index vào mảng này.
 */
export interface CitationSource {
  id: number;
  kb_id: number;
  kb_name: string;
  file_id: number | null;
  file_name: string | null;
  chunk_id: number;
  snippet: string;
  score: number;
}
