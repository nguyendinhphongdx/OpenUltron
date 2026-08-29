'use client';

import { useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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

import { knowledgeBaseService } from '../services/knowledge-base.service';
import { filesQueryKey } from '../hooks/useFiles';
import { foldersQueryKey } from '../hooks/useFolders';
import { knowledgeBaseStatsQueryKey } from '../hooks/useKnowledgeBaseStats';

// Chỉ nhận file dạng text — KB chunk theo nội dung text, chưa có parser cho PDF/docx/ảnh...
const ALLOWED_EXTENSIONS = [
  'txt',
  'md',
  'markdown',
  'csv',
  'json',
  'yml',
  'yaml',
  'log',
  'xml',
  'html',
  'htm',
];
const ALLOWED_EXTENSIONS_SET = new Set(ALLOWED_EXTENSIONS);
const MAX_FILE_SIZE_BYTES = 1_000_000; // 1MB — file lớn hơn bị loại khỏi preview, không upload.
const MAX_CHUNK_CHARS = 4000; // Chunk thô theo số ký tự — chưa có chiến lược chunking ngữ nghĩa.

interface PickedFile {
  file: File;
  relativePath: string;
}

interface FileEntry {
  file: File;
  excluded: boolean;
  reason?: string;
}

interface TreeNode {
  name: string;
  folders: Map<string, TreeNode>;
  files: FileEntry[];
}

function createNode(name: string): TreeNode {
  return { name, folders: new Map(), files: [] };
}

function evaluateFile(file: File): FileEntry {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS_SET.has(ext)) {
    return { file, excluded: true, reason: 'Định dạng chưa hỗ trợ' };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { file, excluded: true, reason: `Vượt quá ${(MAX_FILE_SIZE_BYTES / 1_000_000).toFixed(0)}MB` };
  }
  return { file, excluded: false };
}

function buildTree(picked: PickedFile[]): TreeNode {
  const root = createNode('');
  for (const { file, relativePath } of picked) {
    const parts = relativePath.split('/').filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      let child = node.folders.get(part);
      if (!child) {
        child = createNode(part);
        node.folders.set(part, child);
      }
      node = child;
    }
    node.files.push(evaluateFile(file));
  }
  return root;
}

function entriesFromFileList(fileList: FileList): PickedFile[] {
  return Array.from(fileList).map((file) => ({
    file,
    relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }));
}

/** Đọc 1 `FileSystemEntry` (kéo-thả folder) đệ quy — API `webkitGetAsEntry()` chuẩn W3C, đã có
 * type trong lib.dom (`FileSystemEntry`/`FileSystemFileEntry`/`FileSystemDirectoryEntry`). */
async function readEntryRecursive(entry: FileSystemEntry, path: string): Promise<PickedFile[]> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    const file = await new Promise<File>((resolve, reject) => fileEntry.file(resolve, reject));
    return [{ file, relativePath: path + entry.name }];
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const children: FileSystemEntry[] = await new Promise((resolve, reject) => {
      const all: FileSystemEntry[] = [];
      const readBatch = () => {
        reader.readEntries((batch) => {
          if (batch.length === 0) resolve(all);
          else {
            all.push(...batch);
            readBatch();
          }
        }, reject);
      };
      readBatch();
    });
    const nested = await Promise.all(children.map((child) => readEntryRecursive(child, `${path}${entry.name}/`)));
    return nested.flat();
  }
  return [];
}

async function entriesFromDataTransfer(dt: DataTransfer): Promise<PickedFile[]> {
  const items = Array.from(dt.items);
  const fsEntries = items
    .map((item) => item.webkitGetAsEntry?.())
    .filter((e): e is FileSystemEntry => Boolean(e));
  if (fsEntries.length === 0) {
    // Trình duyệt không hỗ trợ webkitGetAsEntry — fallback: file phẳng, không giữ cấu trúc folder.
    return entriesFromFileList(dt.files);
  }
  const nested = await Promise.all(fsEntries.map((entry) => readEntryRecursive(entry, '')));
  return nested.flat();
}

function countFiles(node: TreeNode): { included: number; excluded: number } {
  let included = 0;
  let excluded = 0;
  for (const f of node.files) {
    if (f.excluded) excluded++;
    else included++;
  }
  for (const child of node.folders.values()) {
    const sub = countFiles(child);
    included += sub.included;
    excluded += sub.excluded;
  }
  return { included, excluded };
}

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

function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += MAX_CHUNK_CHARS) {
    const piece = text.slice(i, i + MAX_CHUNK_CHARS).trim();
    if (piece) chunks.push(piece);
  }
  return chunks;
}

/** Bước 1: kéo-thả hoặc bấm để chọn — hiện rõ định dạng/size chấp nhận trước khi chọn. */
function DropZone({ mode, onPicked }: { mode: 'file' | 'folder'; onPicked: (picked: PickedFile[]) => void }) {
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

/** Bước 2: preview cây + xác nhận tải lên. */
function UploadPreviewStep({
  kbId,
  folderId,
  tree,
  onBack,
  onClose,
}: {
  kbId: number;
  folderId: number | null;
  tree: TreeNode;
  onBack: () => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [finished, setFinished] = useState(false);
  const { included, excluded } = countFiles(tree);

  const handleUpload = async () => {
    setUploading(true);
    setProgress({ done: 0, total: included, failed: 0 });
    let failed = 0;

    const uploadFolder = async (node: TreeNode, targetFolderId: number | null) => {
      for (const entry of node.files) {
        if (entry.excluded) continue;
        try {
          const created = await knowledgeBaseService.createFile(kbId, {
            name: entry.file.name,
            folder_id: targetFolderId,
          });
          const text = await entry.file.text();
          const chunks = splitIntoChunks(text);
          for (const chunk of chunks) {
            await knowledgeBaseService.addFileChunk(kbId, created.id, { content: chunk });
          }
        } catch {
          failed++;
        }
        setProgress((p) => ({ ...p, done: p.done + 1, failed }));
      }
      for (const child of node.folders.values()) {
        try {
          const createdFolder = await knowledgeBaseService.createFolder(kbId, {
            name: child.name,
            parent_folder_id: targetFolderId,
          });
          await uploadFolder(child, createdFolder.id);
        } catch {
          const { included: skipped } = countFiles(child);
          failed += skipped;
          setProgress((p) => ({ ...p, done: p.done + skipped, failed }));
        }
      }
    };

    await uploadFolder(tree, folderId);

    queryClient.invalidateQueries({ queryKey: foldersQueryKey(kbId, folderId) });
    queryClient.invalidateQueries({ queryKey: filesQueryKey(kbId, folderId) });
    queryClient.invalidateQueries({ queryKey: knowledgeBaseStatsQueryKey(kbId) });
    setUploading(false);
    setFinished(true);
  };

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
            <Button size="sm" disabled={uploading || included === 0} onClick={handleUpload}>
              {uploading ? 'Đang tải…' : `Tải lên (${included} file)`}
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  );
}

/** Renderless controller — tải folder/file thật lên KB, client tự đọc nội dung text và gọi tuần tự
 * các endpoint sẵn có (createFolder/createFile/addFileChunk), KHÔNG cần đổi backend. Giới hạn: chỉ
 * nhận file text (chưa có parser PDF/docx/ảnh), tối đa 1MB/file.
 *
 * Dùng: `const upload = useKnowledgeUpload(kbId)`, gọi `upload.requestUpload(folderId, 'file'|'folder')`
 * từ menu item — mở dialog ngay (bước chọn file kéo-thả/click), và render `{upload.portal}` MỘT LẦN
 * ở gốc cây. */
export function useKnowledgeUpload(kbId: number): {
  requestUpload: (folderId: number | null, mode: 'file' | 'folder') => void;
  portal: ReactNode;
} {
  const [picker, setPicker] = useState<{ folderId: number | null; mode: 'file' | 'folder' } | null>(null);
  const [tree, setTree] = useState<TreeNode | null>(null);

  const requestUpload = (folderId: number | null, mode: 'file' | 'folder') => {
    setTree(null);
    setPicker({ folderId, mode });
  };

  const close = () => {
    setPicker(null);
    setTree(null);
  };

  const portal = picker && (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-md sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{picker.mode === 'file' ? 'Tải file lên' : 'Tải folder lên'}</DialogTitle>
        </DialogHeader>

        {tree ? (
          <UploadPreviewStep
            kbId={kbId}
            folderId={picker.folderId}
            tree={tree}
            onBack={() => setTree(null)}
            onClose={close}
          />
        ) : (
          <>
            <DialogBody>
              <DropZone mode={picker.mode} onPicked={(picked) => setTree(buildTree(picked))} />
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

  return { requestUpload, portal };
}
