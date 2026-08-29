'use client';

import { useState } from 'react';

import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Layers } from 'lucide-react';

import { useFileChunks } from '../hooks/useFileChunks';
import type { KnowledgeChunk } from '../types/knowledge-base.types';

function ChunkListItem({
  chunk,
  index,
  active,
  onSelect,
}: {
  chunk: KnowledgeChunk;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-colors',
        active ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:bg-muted/60',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">Chunk #{index + 1}</span>
        <span className="text-xs text-muted-foreground">{chunk.content.length} ký tự</span>
      </div>
      <p className="line-clamp-2 text-xs text-muted-foreground">{chunk.content}</p>
    </button>
  );
}

/** Master–detail: list chunk bên trái, nội dung đầy đủ + metadata bên phải. */
export function ChunkList({ kbId, fileId }: { kbId: number; fileId: number }) {
  const { data: chunks, isPending, isError } = useFileChunks(kbId, fileId);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (isPending) return <LoadingState label="Đang tải chunk…" />;
  if (isError) {
    return <EmptyState icon={Layers} tone="destructive" title="Không tải được danh sách chunk." />;
  }
  if (chunks.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="File này chưa có chunk nào"
        description="Chunk sẽ xuất hiện ở đây sau khi file được phân tích (chunking)."
      />
    );
  }

  const selected = chunks.find((c) => c.id === selectedId) ?? chunks[0];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,280px)_1fr]">
      <ScrollArea className="h-[520px] rounded-xl border border-border bg-white/60 p-2">
        <div className="flex flex-col gap-1">
          {chunks.map((chunk, index) => (
            <ChunkListItem
              key={chunk.id}
              chunk={chunk}
              index={index}
              active={chunk.id === selected.id}
              onSelect={() => setSelectedId(chunk.id)}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-white/60 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Chunk #{chunks.findIndex((c) => c.id === selected.id) + 1}
          </h3>
          <span className="text-xs text-muted-foreground">{selected.content.length} ký tự</span>
        </div>
        <p className="whitespace-pre-wrap text-sm text-foreground">{selected.content}</p>
        {selected.metadata && Object.keys(selected.metadata).length > 0 && (
          <div className="mt-2 rounded-lg bg-muted/50 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Metadata</p>
            <pre className="overflow-x-auto text-xs text-muted-foreground">
              {JSON.stringify(selected.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
