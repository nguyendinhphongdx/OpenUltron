'use client';

import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import {
  CheckCircle2,
  File as FileIcon,
  FileUp,
  Folder as FolderIcon,
  FolderUp,
  Loader2,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  entriesFromDataTransfer,
  entriesFromFileList,
  type TreeNode,
  type UseKnowledgeUpload,
} from '../hooks/useKnowledgeUpload';

/** Presentational — nhận toàn bộ state/handler từ `useKnowledgeUpload`, không tự gọi service. */
function TreePreview({ node, depth }: { node: TreeNode; depth: number }) {
  return (
    <>
      {Array.from(node.folders.values()).map((child) => (
        <div key={child.name} className="min-w-0">
          <div
            className="flex min-w-0 items-center gap-2 py-1 text-sm"
            style={{ paddingLeft: `${depth * 16}px` }}
          >
            <FolderIcon className="size-4 shrink-0 text-amber-500" />
            <span className="min-w-0 truncate font-medium text-foreground">{child.name}</span>
          </div>
          <TreePreview node={child} depth={depth + 1} />
        </div>
      ))}
      {node.files.map((entry, i) => (
        <div key={`${entry.file.name}-${i}`} className="min-w-0" style={{ paddingLeft: `${depth * 16}px` }}>
          <div className="flex min-w-0 items-center gap-2 py-1 text-sm">
            {entry.excluded ? (
              <XCircle className="size-4 shrink-0 text-destructive" aria-label="Không được tải lên" />
            ) : (
              <CheckCircle2 className="size-4 shrink-0 text-green-600" aria-label="Sẽ được tải lên" />
            )}
            <FileIcon
              className={`size-4 shrink-0 ${entry.excluded ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
            />
            <span
              className={`min-w-0 flex-1 truncate ${entry.excluded ? 'text-muted-foreground/50 line-through' : 'text-foreground'}`}
            >
              {entry.file.name}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {(entry.file.size / 1000).toFixed(1)}KB
            </span>
          </div>
          {entry.excluded && <p className="truncate pb-1 pl-6 text-xs text-destructive">{entry.reason}</p>}
        </div>
      ))}
    </>
  );
}

/** Bước 1: kéo-thả hoặc bấm để chọn — hiện rõ định dạng/size chấp nhận trước khi chọn. */
function DropZone({
  mode,
  onPicked,
}: {
  mode: 'file' | 'folder';
  onPicked: (picked: Awaited<ReturnType<typeof entriesFromDataTransfer>>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const picked = await entriesFromDataTransfer(e.dataTransfer);
    if (picked.length > 0) onPicked(picked);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors',
        dragOver ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40',
      )}
    >
      {mode === 'file' ? (
        <FileUp className="size-8 text-muted-foreground" />
      ) : (
        <FolderUp className="size-8 text-muted-foreground" />
      )}
      <p className="text-sm font-medium text-foreground">
        Kéo thả {mode === 'file' ? 'file' : 'thư mục'} vào đây, hoặc bấm để chọn
      </p>
      <p className="max-w-xs text-xs text-muted-foreground">
        Chấp nhận: {ALLOWED_EXTENSIONS.join(', ')} · tối đa {(MAX_FILE_SIZE_BYTES / 1_000_000).toFixed(0)}MB/file
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        {...(mode === 'folder' ? { webkitdirectory: '' } : {})}
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) onPicked(entriesFromFileList(files));
          e.target.value = '';
        }}
      />
    </div>
  );
}

/** Bước 2: preview cây + xác nhận tải lên — thuần presentational, upload thật do
 * `useKnowledgeUpload.upload()` xử lý. */
function UploadPreviewStep({
  tree,
  counts,
  uploading,
  progress,
  finished,
  onBack,
  onClose,
  onUpload,
}: {
  tree: TreeNode;
  counts: { included: number; excluded: number };
  uploading: boolean;
  progress: { done: number; total: number; failed: number };
  finished: boolean;
  onBack: () => void;
  onClose: () => void;
  onUpload: () => void;
}) {
  const { included, excluded } = counts;

  return (
    <>
      <DialogBody className="space-y-4">
        <DialogDescription>
          {included} file hợp lệ{excluded > 0 ? ` · ${excluded} file bị loại (xem lý do bên dưới)` : ''}.
        </DialogDescription>

        <ScrollArea className="h-72 w-full overflow-x-hidden rounded-lg border border-border p-2">
          <TreePreview node={tree} depth={0} />
        </ScrollArea>

        {finished ? (
          <p className="text-sm text-foreground">
            Đã tải {progress.done - progress.failed}/{progress.total} file
            {progress.failed > 0 ? `, ${progress.failed} lỗi` : ''}.
          </p>
        ) : uploading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Đang tải {progress.done}/{progress.total}…
          </p>
        ) : null}
      </DialogBody>

      <DialogFooter>
        {finished ? (
          <Button size="sm" onClick={onClose}>
            Đóng
          </Button>
        ) : (
          <>
            <Button size="sm" variant="ghost" disabled={uploading} onClick={onBack}>
              Chọn lại
            </Button>
            <Button size="sm" variant="outline" disabled={uploading} onClick={onClose}>
              Huỷ
            </Button>
            <Button size="sm" disabled={uploading || included === 0} onClick={onUpload}>
              {uploading ? 'Đang tải…' : `Tải lên (${included} file)`}
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  );
}

/** Dialog upload file/folder vào KB — render theo state của `useKnowledgeUpload(kbId)`. Dùng:
 * `const upload = useKnowledgeUpload(kbId)` ở component cha, gọi `upload.requestUpload(...)` từ
 * menu item, render `<KnowledgeUploadDialog {...upload} />` MỘT LẦN ở gốc cây. */
export function KnowledgeUploadDialog({
  picker,
  tree,
  uploading,
  progress,
  finished,
  counts,
  close,
  back,
  pickFiles,
  upload,
}: UseKnowledgeUpload) {
  if (!picker) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-md sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{picker.mode === 'file' ? 'Tải file lên' : 'Tải folder lên'}</DialogTitle>
        </DialogHeader>

        {tree && counts ? (
          <UploadPreviewStep
            tree={tree}
            counts={counts}
            uploading={uploading}
            progress={progress}
            finished={finished}
            onBack={back}
            onClose={close}
            onUpload={upload}
          />
        ) : (
          <>
            <DialogBody>
              <DropZone mode={picker.mode} onPicked={pickFiles} />
            </DialogBody>
            <DialogFooter>
              <Button size="sm" variant="outline" onClick={close}>
                Huỷ
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
