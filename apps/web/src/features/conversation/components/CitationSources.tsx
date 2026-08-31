'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';

import { useCitationSources } from '../hooks/useCitationSources';

function relevancePercent(score: number): number {
  // `score` là cosine distance (càng nhỏ càng giống, xem `SearchResult` apps/api) — quy đổi thô
  // sang % dễ đọc, clamp 0-100 vì distance có thể âm/vượt 1 tuỳ embedding model.
  return Math.max(0, Math.min(100, Math.round((1 - score) * 100)));
}

/**
 * Khối tổng hợp toàn bộ nguồn KB agent đã dùng trong turn sinh ra message này
 * (docs/features/kb-citation.md) — luôn hiện đầy đủ mọi chunk đã retrieve, KHÔNG phụ thuộc model
 * có cite đúng bằng `[cite:N]` trong text hay không (model hay quên/cite thiếu — kinh nghiệm thực
 * tế từ Open WebUI).
 */
export function CitationSources() {
  const sources = useCitationSources();

  if (sources.length === 0) return null;

  return (
    <details className="mt-2.5 rounded-xl border border-border/70 bg-muted/30 text-xs">
      <summary className="cursor-pointer list-none px-3 py-2 font-medium text-muted-foreground marker:hidden">
        📄 {sources.length} nguồn tham khảo
      </summary>
      <div className="flex flex-col divide-y divide-border/60 border-t border-border/60">
        {sources.map((source) => (
          <div key={source.id} className="flex items-start gap-2 px-3 py-2.5">
            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-medium text-accent">
              {source.id}
            </span>
            <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-foreground">
                  {source.file_name ?? '(không rõ file)'}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {relevancePercent(source.score)}% liên quan
                </span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-muted-foreground">{source.snippet}</p>
              {source.file_id !== null && (
                <Link
                  href={`/knowledge-bases/${source.kb_id}/files/${source.file_id}`}
                  className="mt-1 inline-block text-accent hover:underline"
                >
                  Xem file →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
