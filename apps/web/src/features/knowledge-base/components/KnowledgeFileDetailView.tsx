'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api';

import { useAddFileChunk } from '../hooks/useAddFileChunk';
import { useFile } from '../hooks/useFile';
import { ChunkList } from './ChunkList';
import { FileStatusBadge } from './FileStatusBadge';
import { FolderCrumbs } from './FolderCrumbs';

function AddChunkForm({ kbId, fileId, folderId }: { kbId: number; fileId: number; folderId: number | null }) {
  const addChunk = useAddFileChunk(kbId, folderId);
  const [content, setContent] = useState('');

  return (
    <form
      className="flex flex-col gap-2 rounded-xl border border-border bg-white/60 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!content.trim()) return;
        addChunk.mutate({ fileId, input: { content } }, { onSuccess: () => setContent('') });
      }}
    >
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        placeholder="Dán nội dung cần phân tích (chunk) cho file này…"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={addChunk.isPending || !content.trim()}>
          {addChunk.isPending ? 'Đang phân tích…' : 'Thêm chunk'}
        </Button>
        {addChunk.isError && (
          <p className="text-sm text-destructive">{getApiErrorMessage(addChunk.error)}</p>
        )}
      </div>
    </form>
  );
}

/** Trang chi tiết 1 file: breadcrumb + trạng thái + danh sách chunk đã phân tích (master-detail). */
export function KnowledgeFileDetailView({ kbId, fileId }: { kbId: number; fileId: number }) {
  const { data: file, isPending, isError } = useFile(kbId, fileId);

  if (isPending) return <LoadingState label="Đang tải file…" />;
  if (isError || !file) {
    return <EmptyState icon={FileText} tone="destructive" title="Không tải được file." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href={`/knowledge-bases/${kbId}`} className="hover:text-foreground hover:underline">
          Files
        </Link>
        <FolderCrumbs kbId={kbId} folderId={file.folder_id} />
        <span>/</span>
        <span className="text-foreground">{file.name}</span>
      </div>

      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-foreground">{file.name}</h2>
        <FileStatusBadge status={file.status} />
      </div>
      {file.status === 'error' && file.error_message && (
        <p className="text-sm text-destructive">{file.error_message}</p>
      )}

      <AddChunkForm kbId={kbId} fileId={fileId} folderId={file.folder_id} />
      <ChunkList kbId={kbId} fileId={fileId} />
    </div>
  );
}
