'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { knowledgeBaseService } from '../services/knowledge-base.service';
import { filesQueryKey } from './useFiles';
import { foldersQueryKey } from './useFolders';
import { knowledgeBaseStatsQueryKey } from './useKnowledgeBaseStats';

// Chỉ nhận file dạng text — KB chunk theo nội dung text, chưa có parser cho PDF/docx/ảnh...
export const ALLOWED_EXTENSIONS = [
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
export const MAX_FILE_SIZE_BYTES = 1_000_000; // 1MB — file lớn hơn bị loại khỏi preview, không upload.
const MAX_CHUNK_CHARS = 4000; // Chunk thô theo số ký tự — chưa có chiến lược chunking ngữ nghĩa.

export interface PickedFile {
  file: File;
  relativePath: string;
}

export interface FileEntry {
  file: File;
  excluded: boolean;
  reason?: string;
}

export interface TreeNode {
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

export function entriesFromFileList(fileList: FileList): PickedFile[] {
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

export async function entriesFromDataTransfer(dt: DataTransfer): Promise<PickedFile[]> {
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

function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += MAX_CHUNK_CHARS) {
    const piece = text.slice(i, i + MAX_CHUNK_CHARS).trim();
    if (piece) chunks.push(piece);
  }
  return chunks;
}

/** Tải folder/file thật lên KB, client tự đọc nội dung text và gọi tuần tự các endpoint sẵn có
 * (createFolder/createFile/addFileChunk), KHÔNG cần đổi backend. Giới hạn: chỉ nhận file text
 * (chưa có parser PDF/docx/ảnh), tối đa 1MB/file.
 *
 * Chứa toàn bộ state + business logic (picker/tree/upload progress, gọi service) — component
 * `KnowledgeUploadDialog` (`components/KnowledgeUpload.tsx`) chỉ render theo state trả về, không tự
 * gọi service (đúng layering `02-frontend-nextjs.md`). */
export function useKnowledgeUpload(kbId: number) {
  const queryClient = useQueryClient();
  const [picker, setPicker] = useState<{ folderId: number | null; mode: 'file' | 'folder' } | null>(null);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [finished, setFinished] = useState(false);

  const requestUpload = (folderId: number | null, mode: 'file' | 'folder') => {
    setTree(null);
    setFinished(false);
    setPicker({ folderId, mode });
  };

  const close = () => {
    setPicker(null);
    setTree(null);
    setFinished(false);
  };

  const back = () => setTree(null);

  const pickFiles = (picked: PickedFile[]) => setTree(buildTree(picked));

  const upload = async () => {
    if (!tree || !picker) return;
    const { included } = countFiles(tree);
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

    await uploadFolder(tree, picker.folderId);

    queryClient.invalidateQueries({ queryKey: foldersQueryKey(kbId, picker.folderId) });
    queryClient.invalidateQueries({ queryKey: filesQueryKey(kbId, picker.folderId) });
    queryClient.invalidateQueries({ queryKey: knowledgeBaseStatsQueryKey(kbId) });
    setUploading(false);
    setFinished(true);
  };

  return {
    picker,
    tree,
    uploading,
    progress,
    finished,
    counts: tree ? countFiles(tree) : null,
    requestUpload,
    close,
    back,
    pickFiles,
    upload,
  };
}

export type UseKnowledgeUpload = ReturnType<typeof useKnowledgeUpload>;
