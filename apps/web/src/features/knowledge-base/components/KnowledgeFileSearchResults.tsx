'use client';

import Link from 'next/link';
import { FileSearch } from 'lucide-react';

import { EmptyState, LoadingState } from '@/components/shared/EmptyState';

import { useSearchFiles } from '../hooks/useSearchFiles';
import { FileStatusBadge } from './FileStatusBadge';
import { FolderCrumbs } from './FolderCrumbs';

/** Kết quả tìm file theo tên (substring, xuyên suốt cả cây, không phải mở từng folder) —
 * thay thế `DriveList` khi có từ khoá tìm kiếm. */
export function KnowledgeFileSearchResults({ kbId, query }: { kbId: number; query: string }) {
  const { data: files, isPending, isError } = useSearchFiles(kbId, query);

  if (isPending) return <LoadingState label="Đang tìm…" />;
  if (isError) {
    return <EmptyState icon={FileSearch} tone="destructive" title="Không tìm được file." />;
  }
  if (files.length === 0) {
    return (
      <EmptyState
        icon={FileSearch}
        title="Không tìm thấy file nào"
        description={`Không có file nào khớp với "${query}".`}
      />
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-white/60 p-2">
      {files.map((file) => (
        <Link
          key={file.id}
          href={`/knowledge-bases/${kbId}/files/${file.id}`}
          className="flex min-w-0 flex-col gap-0.5 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/60"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-medium text-foreground">{file.name}</span>
            <FileStatusBadge status={file.status} />
          </div>
          <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <span>Files</span>
            <FolderCrumbs kbId={kbId} folderId={file.folder_id} />
          </div>
        </Link>
      ))}
    </div>
  );
}
