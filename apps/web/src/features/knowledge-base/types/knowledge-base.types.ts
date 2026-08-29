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
  file_id: number | null;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ChunkCreateInput {
  content: string;
  metadata?: Record<string, unknown> | null;
}

export interface KnowledgeFolder {
  id: number;
  kb_id: number;
  parent_folder_id: number | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FolderCreateInput {
  name: string;
  parent_folder_id?: number | null;
}

export type FileStatus = 'pending' | 'chunking' | 'done' | 'error';

export interface KnowledgeFile {
  id: number;
  kb_id: number;
  folder_id: number | null;
  name: string;
  status: FileStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileCreateInput {
  name: string;
  folder_id?: number | null;
}

export interface SearchResult {
  chunk: KnowledgeChunk;
  score: number; // cosine distance — càng nhỏ càng giống
}

export interface KnowledgeBaseStats {
  total_folders: number;
  total_files: number;
  files_by_status: Partial<Record<FileStatus, number>>;
  total_chunks: number;
  total_content_chars: number;
}
