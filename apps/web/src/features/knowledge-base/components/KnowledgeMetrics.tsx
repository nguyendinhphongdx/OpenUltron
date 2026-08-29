'use client';

import { FileText, Folder, Layers } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { useKnowledgeBaseStats } from '../hooks/useKnowledgeBaseStats';
import type { FileStatus } from '../types/knowledge-base.types';
import { fileStatusLabel } from './FileStatusBadge';

function formatChars(chars: number): string {
  if (chars < 1000) return `${chars} ký tự`;
  if (chars < 1_000_000) return `${(chars / 1000).toFixed(1)}k ký tự`;
  return `${(chars / 1_000_000).toFixed(1)}M ký tự`;
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Folder }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white/60 px-4 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold tabular-nums text-foreground">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/** Vùng metric tổng quan trang chi tiết KB — đếm phẳng qua `GET /{kb}/stats`, không đệ quy FE. */
export function KnowledgeMetrics({ kbId }: { kbId: number }) {
  const { data: stats, isPending } = useKnowledgeBaseStats(kbId);

  if (isPending || !stats) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] rounded-xl" />
        ))}
      </div>
    );
  }

  const statusEntries = Object.entries(stats.files_by_status) as [FileStatus, number][];

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Folder" value={stats.total_folders.toString()} icon={Folder} />
        <MetricCard label="File" value={stats.total_files.toString()} icon={FileText} />
        <MetricCard label="Chunk đã phân tích" value={stats.total_chunks.toString()} icon={Layers} />
        <MetricCard
          label="Dung lượng nội dung (ước tính)"
          value={formatChars(stats.total_content_chars)}
          icon={FileText}
        />
      </div>
      {statusEntries.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Trạng thái file:{' '}
          {statusEntries
            .map(([status, count]) => `${fileStatusLabel(status)} (${count})`)
            .join(' · ')}
        </p>
      )}
    </div>
  );
}
