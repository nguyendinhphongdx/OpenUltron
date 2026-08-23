/** Khớp `apps/api/app/modules/ollama/{catalog,schemas}.py` (ADR-0011). */

export interface OllamaCatalogEntry {
  name: string;
  description: string;
  suggested_tags: string[];
}

export interface OllamaInstalledModel {
  name: string;
  size_bytes: number | null;
}

export interface OllamaPullEvent {
  status: string;
  completed: number | null;
  total: number | null;
  error: string | null;
}
