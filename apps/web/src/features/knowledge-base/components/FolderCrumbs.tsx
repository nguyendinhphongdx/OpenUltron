'use client';

import { useFolder } from '../hooks/useFolder';

/** Breadcrumb 1 folder — đệ quy lên `parent_folder_id` tới gốc. Dùng ở trang chi tiết file
 * và kết quả tìm kiếm file theo tên. */
export function FolderCrumbs({ kbId, folderId }: { kbId: number; folderId: number | null }) {
  const { data: folder } = useFolder(kbId, folderId);
  if (folderId == null || !folder) return null;
  return (
    <>
      <FolderCrumbs kbId={kbId} folderId={folder.parent_folder_id} />
      <span>/</span>
      <span>{folder.name}</span>
    </>
  );
}
