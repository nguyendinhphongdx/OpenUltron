'use client';

import { useParams, useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/layout/PageShell';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
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

  if (isPending) {
    return (
      <PageShell title={`Knowledge base #${params.id}`}>
        <LoadingState label="Đang tải knowledge base…" />
      </PageShell>
    );
  }
  if (isError || !knowledgeBase) {
    return (
      <PageShell title={`Knowledge base #${params.id}`}>
        <EmptyState icon={BookOpen} tone="destructive" title="Không tải được knowledge base." />
      </PageShell>
    );
  }

  return (
    <PageShell
      title={knowledgeBase.name}
      action={
        <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleteKnowledgeBase.isPending}>
          Xoá
        </Button>
      }
    >
      <div className="flex flex-col gap-8">
        {deleteKnowledgeBase.isError && (
          <p className="text-sm text-destructive">{getApiErrorMessage(deleteKnowledgeBase.error)}</p>
        )}

        <KnowledgeBaseForm knowledgeBase={knowledgeBase} />

        <section className="flex flex-col gap-2 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">Folder / File</h2>
          <p className="text-xs text-muted-foreground">
            Nested folder kiểu Google Drive — mỗi file có trạng thái chunking riêng.
          </p>
          <FolderTree kbId={kbId} />
        </section>

        <section className="flex flex-col gap-2 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">Thêm chunk trực tiếp vào KB</h2>
          <p className="text-xs text-muted-foreground">
            Không gắn file nào — tương thích ngược với chunk tạo trước khi có Folder/File.
          </p>
          <ChunkAdder kbId={kbId} />
        </section>

        <section className="flex flex-col gap-2 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">Tìm kiếm</h2>
          <KnowledgeSearchPanel kbId={kbId} />
        </section>
      </div>
    </PageShell>
  );
}
