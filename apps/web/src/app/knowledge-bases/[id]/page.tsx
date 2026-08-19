'use client';

import { useParams, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { ChunkAdder } from '@/features/knowledge-base/components/ChunkAdder';
import { FolderTree } from '@/features/knowledge-base/components/FolderTree';
import { KnowledgeBaseForm } from '@/features/knowledge-base/components/KnowledgeBaseForm';
import { KnowledgeSearchPanel } from '@/features/knowledge-base/components/KnowledgeSearchPanel';
import { useDeleteKnowledgeBase } from '@/features/knowledge-base/hooks/useDeleteKnowledgeBase';
import { useKnowledgeBase } from '@/features/knowledge-base/hooks/useKnowledgeBase';
import { getApiErrorMessage } from '@/lib/api';

export default function KnowledgeBaseDetailPage() {
  const params = useParams<{ id: string }>();
  const kbId = Number(params.id);
  const router = useRouter();

  const { data: knowledgeBase, isPending, isError } = useKnowledgeBase(kbId);
  const deleteKnowledgeBase = useDeleteKnowledgeBase();

  const handleDelete = () => {
    if (!window.confirm('Xoá knowledge base này?')) return;
    deleteKnowledgeBase.mutate(kbId, {
      onSuccess: () => router.push('/knowledge-bases'),
    });
  };

  if (isPending) return <p className="p-4 text-sm text-foreground/60">Đang tải knowledge base…</p>;
  if (isError || !knowledgeBase) {
    return <p className="p-4 text-sm text-red-500">Không tải được knowledge base.</p>;
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{knowledgeBase.name}</h1>
        <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleteKnowledgeBase.isPending}>
          Xoá
        </Button>
      </div>

      {deleteKnowledgeBase.isError && (
        <p className="text-sm text-red-500">{getApiErrorMessage(deleteKnowledgeBase.error)}</p>
      )}

      <KnowledgeBaseForm knowledgeBase={knowledgeBase} />

      <section className="flex flex-col gap-2 border-t border-border pt-6">
        <h2 className="text-sm font-semibold">Folder / File</h2>
        <p className="text-xs text-foreground/60">
          Nested folder kiểu Google Drive — mỗi file có trạng thái chunking riêng.
        </p>
        <FolderTree kbId={kbId} />
      </section>

      <section className="flex flex-col gap-2 border-t border-border pt-6">
        <h2 className="text-sm font-semibold">Thêm chunk trực tiếp vào KB</h2>
        <p className="text-xs text-foreground/60">
          Không gắn file nào — tương thích ngược với chunk tạo trước khi có Folder/File.
        </p>
        <ChunkAdder kbId={kbId} />
      </section>

      <section className="flex flex-col gap-2 border-t border-border pt-6">
        <h2 className="text-sm font-semibold">Tìm kiếm</h2>
        <KnowledgeSearchPanel kbId={kbId} />
      </section>
    </main>
  );
}
