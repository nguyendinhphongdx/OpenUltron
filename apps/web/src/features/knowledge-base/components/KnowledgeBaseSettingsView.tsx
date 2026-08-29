'use client';

import { useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { getApiErrorMessage } from '@/lib/api';

import { useDeleteKnowledgeBase } from '../hooks/useDeleteKnowledgeBase';
import { useKnowledgeBase } from '../hooks/useKnowledgeBase';
import { ChunkAdder } from './ChunkAdder';
import { KnowledgeBaseForm } from './KnowledgeBaseForm';

/** Tab "Cài đặt" — sửa tên/mô tả (slug + embedding model read-only, xem `KnowledgeBaseForm`), xoá KB,
 * và công cụ nâng cao (thêm chunk trực tiếp — tương thích ngược với dữ liệu tạo trước khi có
 * Folder/File, không thuộc luồng chính nên tách riêng khỏi tab Files). */
export function KnowledgeBaseSettingsView({ kbId }: { kbId: number }) {
  const { data: knowledgeBase, isPending, isError } = useKnowledgeBase(kbId);
  const deleteKnowledgeBase = useDeleteKnowledgeBase();
  const router = useRouter();

  if (isPending) return <LoadingState label="Đang tải…" />;
  if (isError || !knowledgeBase) {
    return <EmptyState icon={BookOpen} tone="destructive" title="Không tải được knowledge base." />;
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Thông tin</h2>
        <KnowledgeBaseForm knowledgeBase={knowledgeBase} />
      </section>

      <section className="flex flex-col gap-2 border-t border-border pt-6">
        <h2 className="text-sm font-semibold text-foreground">Nâng cao</h2>
        <p className="text-xs text-muted-foreground">
          Thêm chunk không gắn với file nào — dùng cho dữ liệu tạo trước khi KB có Folder/File.
        </p>
        <ChunkAdder kbId={kbId} />
      </section>

      <section className="flex flex-col items-start gap-2 border-t border-destructive/20 pt-6">
        <h2 className="text-sm font-semibold text-destructive">Xoá knowledge base</h2>
        <p className="text-xs text-muted-foreground">
          Xoá toàn bộ folder, file và chunk bên trong. Không thể hoàn tác.
        </p>
        <ConfirmDialog
          trigger={
            <Button variant="destructive" size="sm">
              Xoá knowledge base
            </Button>
          }
          title={`Xoá knowledge base "${knowledgeBase.name}"?`}
          description="Toàn bộ folder/file/chunk bên trong cũng sẽ bị xoá. Không thể hoàn tác."
          onConfirm={() =>
            deleteKnowledgeBase.mutate(kbId, { onSuccess: () => router.push('/knowledge-bases') })
          }
          isPending={deleteKnowledgeBase.isPending}
        />
        {deleteKnowledgeBase.isError && (
          <p className="text-sm text-destructive">{getApiErrorMessage(deleteKnowledgeBase.error)}</p>
        )}
      </section>
    </div>
  );
}
