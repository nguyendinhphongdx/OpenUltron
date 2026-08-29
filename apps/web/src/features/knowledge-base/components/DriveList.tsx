'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  ChevronDown,
  ChevronRight,
  File as FileIcon,
  FilePlus,
  FileUp,
  Folder as FolderIcon,
  FolderPlus,
  FolderUp,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';

import { useCreateFile } from '../hooks/useCreateFile';
import { useCreateFolder } from '../hooks/useCreateFolder';
import { useDeleteFile } from '../hooks/useDeleteFile';
import { useDeleteFolder } from '../hooks/useDeleteFolder';
import { useFiles } from '../hooks/useFiles';
import { useFolders } from '../hooks/useFolders';
import type { KnowledgeFile, KnowledgeFolder } from '../types/knowledge-base.types';
import { FileStatusBadge } from './FileStatusBadge';
import { useKnowledgeUpload } from './KnowledgeUpload';

type UploadMode = 'file' | 'folder';

type Creating = { folderId: number | null; type: 'folder' | 'file' } | null;

/** Roving-focus giữa các `[role="treeitem"]` đang render (thứ tự DOM = thứ tự cây đang mở). */
function focusSibling(container: HTMLElement, current: HTMLElement, delta: 1 | -1) {
  const items = Array.from(container.querySelectorAll<HTMLElement>('[role="treeitem"]'));
  const index = items.indexOf(current);
  if (index === -1) return;
  const next = items[index + delta];
  next?.focus();
}

function FolderRow({
  kbId,
  folder,
  depth,
  expanded,
  onToggle,
  onRequestCreate,
  onRequestUpload,
}: {
  kbId: number;
  folder: KnowledgeFolder;
  depth: number;
  expanded: boolean;
  onToggle: () => void;
  onRequestCreate: (type: 'folder' | 'file') => void;
  onRequestUpload: (mode: UploadMode) => void;
}) {
  const deleteFolder = useDeleteFolder(kbId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const container = e.currentTarget.closest('[role="tree"]');
    if (!container) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusSibling(container as HTMLElement, e.currentTarget, 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusSibling(container as HTMLElement, e.currentTarget, -1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (!expanded) onToggle();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (expanded) onToggle();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div
      role="treeitem"
      aria-expanded={expanded}
      aria-selected={false}
      aria-level={depth + 1}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={onToggle}
      className="group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
      style={{ paddingLeft: `${depth * 20 + 8}px` }}
    >
      {expanded ? (
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      <FolderIcon className="size-4 shrink-0 text-amber-500" />
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{folder.name}</span>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="sm"
              variant="ghost"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              aria-label={`Thao tác với folder "${folder.name}"`}
              className="opacity-0 group-hover:opacity-100"
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => onRequestCreate('folder')}>
            <FolderPlus className="size-4" data-icon="inline-start" />
            Thêm folder
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRequestCreate('file')}>
            <FilePlus className="size-4" data-icon="inline-start" />
            Thêm file
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onRequestUpload('file')}>
            <FileUp className="size-4" data-icon="inline-start" />
            Tải file lên
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRequestUpload('folder')}>
            <FolderUp className="size-4" data-icon="inline-start" />
            Tải folder lên
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="size-4" data-icon="inline-start" />
            Xoá
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Xoá folder "${folder.name}"?`}
        description="Toàn bộ folder/file bên trong cũng sẽ bị xoá."
        onConfirm={() =>
          deleteFolder.mutate({ folderId: folder.id, parentFolderId: folder.parent_folder_id })
        }
        isPending={deleteFolder.isPending}
      />
    </div>
  );
}

function FileRow({
  kbId,
  file,
  depth,
  folderId,
}: {
  kbId: number;
  file: KnowledgeFile;
  depth: number;
  folderId: number | null;
}) {
  const deleteFile = useDeleteFile(kbId);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const container = e.currentTarget.closest('[role="tree"]');
    if (!container) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusSibling(container as HTMLElement, e.currentTarget, 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusSibling(container as HTMLElement, e.currentTarget, -1);
    }
  };

  return (
    <div
      role="treeitem"
      aria-selected={false}
      aria-level={depth + 1}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
      style={{ paddingLeft: `${depth * 20 + 8}px` }}
    >
      <span className="size-3.5 shrink-0" />
      <FileIcon className="size-4 shrink-0 text-muted-foreground" />
      <Link
        href={`/knowledge-bases/${kbId}/files/${file.id}`}
        className="min-w-0 flex-1 truncate text-foreground hover:underline"
      >
        {file.name}
      </Link>
      {file.status === 'error' && file.error_message && (
        <span className="hidden max-w-[16rem] truncate text-xs text-destructive sm:inline">
          {file.error_message}
        </span>
      )}
      <FileStatusBadge status={file.status} />
      <ConfirmDialog
        trigger={
          <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100">
            Xoá
          </Button>
        }
        title={`Xoá file "${file.name}"?`}
        onConfirm={() => deleteFile.mutate({ fileId: file.id, folderId })}
        isPending={deleteFile.isPending}
      />
    </div>
  );
}

/** Form tạo 1 folder/file con — `type` đã chốt sẵn từ menu dropdown gọi tới, chỉ còn nhập tên. */
function CreateRow({
  kbId,
  folderId,
  depth,
  type,
  onDone,
}: {
  kbId: number;
  folderId: number | null;
  depth: number;
  type: 'folder' | 'file';
  onDone: () => void;
}) {
  const createFolder = useCreateFolder(kbId);
  const createFile = useCreateFile(kbId);
  const [name, setName] = useState('');
  const isPending = type === 'folder' ? createFolder.isPending : createFile.isPending;

  return (
    <form
      style={{ paddingLeft: `${depth * 20 + 8}px` }}
      className="flex items-center gap-2 py-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (type === 'folder') {
          createFolder.mutate({ name: name.trim(), parent_folder_id: folderId }, { onSuccess: onDone });
        } else {
          createFile.mutate({ name: name.trim(), folder_id: folderId }, { onSuccess: onDone });
        }
      }}
    >
      {type === 'folder' ? (
        <FolderIcon className="size-4 shrink-0 text-amber-500" />
      ) : (
        <FileIcon className="size-4 shrink-0 text-muted-foreground" />
      )}
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={type === 'folder' ? 'Tên folder…' : 'Tên file…'}
        className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
      />
      <Button size="sm" type="submit" disabled={!name.trim() || isPending}>
        Tạo
      </Button>
      <Button size="sm" type="button" variant="ghost" onClick={onDone}>
        Huỷ
      </Button>
    </form>
  );
}

function DriveLevel({
  kbId,
  parentFolderId,
  depth,
  expanded,
  onToggle,
  creating,
  onRequestCreate,
  onCancelCreate,
  onRequestUpload,
}: {
  kbId: number;
  parentFolderId: number | null;
  depth: number;
  expanded: Set<number>;
  onToggle: (folderId: number) => void;
  creating: Creating;
  onRequestCreate: (folderId: number | null, type: 'folder' | 'file') => void;
  onCancelCreate: () => void;
  onRequestUpload: (folderId: number | null, mode: UploadMode) => void;
}) {
  const PAGE_SIZE = 50;
  const [folderLimit, setFolderLimit] = useState(PAGE_SIZE);
  const [fileLimit, setFileLimit] = useState(PAGE_SIZE);
  const { data: folders } = useFolders(kbId, parentFolderId, folderLimit);
  const { data: files } = useFiles(kbId, parentFolderId, fileLimit);

  return (
    <>
      {folders?.map((folder) => (
        <div key={folder.id}>
          <FolderRow
            kbId={kbId}
            folder={folder}
            depth={depth}
            expanded={expanded.has(folder.id)}
            onToggle={() => onToggle(folder.id)}
            onRequestCreate={(type) => onRequestCreate(folder.id, type)}
            onRequestUpload={(mode) => onRequestUpload(folder.id, mode)}
          />
          {expanded.has(folder.id) && (
            <DriveLevel
              kbId={kbId}
              parentFolderId={folder.id}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              creating={creating}
              onRequestCreate={onRequestCreate}
              onCancelCreate={onCancelCreate}
              onRequestUpload={onRequestUpload}
            />
          )}
        </div>
      ))}
      {folders && folders.length === folderLimit && (
        <button
          onClick={() => setFolderLimit((n) => n + PAGE_SIZE)}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          className="py-1 text-left text-xs text-primary hover:underline"
        >
          Tải thêm folder…
        </button>
      )}
      {files?.map((file) => (
        <FileRow key={file.id} kbId={kbId} file={file} depth={depth} folderId={parentFolderId} />
      ))}
      {files && files.length === fileLimit && (
        <button
          onClick={() => setFileLimit((n) => n + PAGE_SIZE)}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          className="py-1 text-left text-xs text-primary hover:underline"
        >
          Tải thêm file…
        </button>
      )}
      {creating?.folderId === parentFolderId && (
        <CreateRow
          kbId={kbId}
          folderId={parentFolderId}
          depth={depth}
          type={creating.type}
          onDone={onCancelCreate}
        />
      )}
    </>
  );
}

/** UI kiểu Google Drive: 1 danh sách phẳng-hợp-nhất, mỗi item là file hoặc folder; folder toggle
 * mở/đóng in-place (không điều hướng trang). Mỗi folder có menu "…" để thêm folder/file con —
 * thay cho 2 nút "+ Folder"/"+ File" luôn hiện ở mọi cấp. `role="tree"` + roving focus bàn phím. */
export function DriveList({ kbId }: { kbId: number }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState<Creating>(null);
  const { data: rootFolders } = useFolders(kbId, null);
  const { data: rootFiles } = useFiles(kbId, null);
  const containerRef = useRef<HTMLDivElement>(null);
  const upload = useKnowledgeUpload(kbId);

  const toggle = (folderId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const isEmpty = rootFolders?.length === 0 && rootFiles?.length === 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
            <FolderPlus className="size-3.5" data-icon="inline-start" />
            Thêm vào gốc
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setCreating({ folderId: null, type: 'folder' })}>
              <FolderPlus className="size-4" data-icon="inline-start" />
              Thêm folder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCreating({ folderId: null, type: 'file' })}>
              <FilePlus className="size-4" data-icon="inline-start" />
              Thêm file
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => upload.requestUpload(null, 'file')}>
              <FileUp className="size-4" data-icon="inline-start" />
              Tải file lên
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => upload.requestUpload(null, 'folder')}>
              <FolderUp className="size-4" data-icon="inline-start" />
              Tải folder lên
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {upload.portal}

      {isEmpty && !creating ? (
        <EmptyState
          icon={FolderIcon}
          title="KB này chưa có folder/file nào"
          description={'Dùng nút "Thêm vào gốc" phía trên để tạo folder/file đầu tiên.'}
        />
      ) : (
        <div
          ref={containerRef}
          role="tree"
          aria-label="Folder và file trong knowledge base"
          className={cn('flex flex-col rounded-xl border border-border bg-white/60 p-2')}
        >
          <DriveLevel
            kbId={kbId}
            parentFolderId={null}
            depth={0}
            expanded={expanded}
            onToggle={toggle}
            creating={creating}
            onRequestCreate={(folderId, type) => {
              // Tự mở folder đích trước — nếu đang đóng thì children (gồm form tạo) không render.
              if (folderId != null) {
                setExpanded((prev) => (prev.has(folderId) ? prev : new Set(prev).add(folderId)));
              }
              setCreating({ folderId, type });
            }}
            onCancelCreate={() => setCreating(null)}
            onRequestUpload={(folderId, mode) => upload.requestUpload(folderId, mode)}
          />
        </div>
      )}
    </div>
  );
}
