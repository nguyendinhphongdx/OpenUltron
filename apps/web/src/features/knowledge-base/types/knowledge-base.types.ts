/**
 * Khớp `apps/api/app/modules/knowledge_base/schemas.py` — đổi shape ở BE thì sửa ở đây,
 * service/hook/component không tự đoán field.
 */

export interface KnowledgeBase {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  embedding_model_id: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseCreateInput {
  slug: string;
  name: string;
  description?: string | null;
  embedding_model_id: number;
}

export type KnowledgeBaseUpdateInput = Partial<Pick<KnowledgeBase, 'name' | 'description'>>;

export interface KnowledgeChunk {
  id: number;
  kb_id: number;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ChunkCreateInput {
  content: string;
  metadata?: Record<string, unknown> | null;
}

export interface SearchResult {
  chunk: KnowledgeChunk;
  score: number; // cosine distance — càng nhỏ càng giống
}
