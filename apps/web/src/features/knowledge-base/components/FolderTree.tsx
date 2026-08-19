'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, File as FileIcon, Folder as FolderIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAddFileChunk } from '../hooks/useAddFileChunk';
import { useCreateFile } from '../hooks/useCreateFile';
import { useCreateFolder } from '../hooks/useCreateFolder';
import { useDeleteFile } from '../hooks/useDeleteFile';
import { useDeleteFolder } from '../hooks/useDeleteFolder';
import { useFiles } from '../hooks/useFiles';
import { useFolders } from '../hooks/useFolders';
import type { FileStatus, KnowledgeFile } from '../types/knowledge-base.types';

const STATUS_STYLE: Record<FileStatus, string> = {
  pending: 'text-foreground/50',
  chunking: 'text-amber-600',
  done: 'text-green-600',
  error: 'text-red-500',
};

const STATUS_LABEL: Record<FileStatus, string> = {
  pending: 'chưa chunk',
  chunking: 'đang chunk…',
  done: 'đã chunk',
  error: 'lỗi',
};

function FileRow({ kbId, folderId, file }: { kbId: number; folderId: number | null; file: KnowledgeFile }) {
  const [content, setContent] = useState('');
  const addChunk = useAddFileChunk(kbId, folderId);
  const deleteFile = useDeleteFile(kbId);

  return (
    <li className="ml-6 border-l border-border pl-3 py-1.5">
      <div className="flex items-center gap-2">
        <FileIcon className="h-3.5 w-3.5 shrink-0 text-foreground/50" />
        <span className="flex-1 truncate text-sm">{file.name}</span>
        <span className={cn('font-mono text-[10px] uppercase', STATUS_STYLE[file.status])}>
          {STATUS_LABEL[file.status]}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (!window.confirm(`Xoá file "${file.name}"?`)) return;
            deleteFile.mutate({ fileId: file.id, folderId });
          }}
        >
          Xoá
        </Button>
      </div>
      {file.status === 'error' && file.error_message && (
        <p className="mt-0.5 text-xs text-red-500">{file.error_message}</p>
      )}
      <div className="mt-1.5 flex gap-1.5">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Nội dung chunk…"
          className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!content.trim() || addChunk.isPending}
          onClick={() => {
            addChunk.mutate(
              { fileId: file.id, input: { content } },
              { onSuccess: () => setContent('') },
            );
          }}
        >
          + Chunk
        </Button>
      </div>
    </li>
  );
}

function FolderNode({ kbId, folderId }: { kbId: number; folderId: number | null }) {
  const [expanded, setExpanded] = useState(folderId === null);
  const { data: subfolders } = useFolders(kbId, folderId);
  const { data: files } = useFiles(kbId, folderId);
  const createFolder = useCreateFolder(kbId);
  const createFile = useCreateFile(kbId);
  const deleteFolder = useDeleteFolder(kbId);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 py-1 text-sm text-foreground/70 hover:text-foreground"
      >
        <ChevronRight className="h-3.5 w-3.5" />
        <FolderIcon className="h-3.5 w-3.5" />
        {folderId === null ? '(gốc)' : '…'}
      </button>
    );
  }

  return (
    <div>
      {folderId !== null && (
        <button
          onClick={() => setExpanded(false)}
          className="flex items-center gap-1.5 py-1 text-sm font-medium"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          <FolderIcon className="h-3.5 w-3.5" />
        </button>
      )}

      <ul className="ml-2">
        {subfolders?.map((folder) => (
          <li key={folder.id} className="ml-4 border-l border-border pl-3">
            <div className="flex items-center justify-between gap-2">
              <FolderNode kbId={kbId} folderId={folder.id} />
              <div className="flex items-center gap-2 pr-1">
                <span className="text-xs text-foreground/60">{folder.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (!window.confirm(`Xoá folder "${folder.name}" (và nội dung bên trong)?`)) return;
                    deleteFolder.mutate({ folderId: folder.id, parentFolderId: folderId });
                  }}
                >
                  Xoá
                </Button>
              </div>
            </div>
          </li>
        ))}

        {files?.map((file) => (
          <FileRow key={file.id} kbId={kbId} folderId={folderId} file={file} />
        ))}
      </ul>

      <div className="ml-6 mt-1 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const name = window.prompt('Tên folder mới:');
            if (!name?.trim()) return;
            createFolder.mutate({ name: name.trim(), parent_folder_id: folderId });
          }}
        >
          + Folder
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const name = window.prompt('Tên file mới:');
            if (!name?.trim()) return;
            createFile.mutate({ name: name.trim(), folder_id: folderId });
          }}
        >
          + File
        </Button>
      </div>
    </div>
  );
}

export function FolderTree({ kbId }: { kbId: number }) {
  return <FolderNode kbId={kbId} folderId={null} />;
}
