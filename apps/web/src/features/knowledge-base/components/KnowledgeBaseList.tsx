'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { getApiErrorMessage } from '@/lib/api';

import { useDeleteKnowledgeBase } from '../hooks/useDeleteKnowledgeBase';
import { useKnowledgeBases } from '../hooks/useKnowledgeBases';

export function KnowledgeBaseList() {
  const { data: knowledgeBases, isPending, isError } = useKnowledgeBases();
  const deleteKnowledgeBase = useDeleteKnowledgeBase();

  if (isPending) return <LoadingState label="Đang tải knowledge base…" />;
  if (isError) {
    return <EmptyState icon={BookOpen} tone="destructive" title="Không tải được danh sách knowledge base." />;
  }
  if (knowledgeBases.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Chưa có knowledge base nào"
        description="Tạo knowledge base đầu tiên để bắt đầu."
      />
    );
  }

  const handleDelete = (id: number) => {
    if (!window.confirm('Xoá knowledge base này?')) return;
    deleteKnowledgeBase.mutate(id);
  };

  return (
    <div className="space-y-3">
      <Card className="py-0">
        <ul className="divide-y divide-border">
          {knowledgeBases.map((kb) => (
            <li key={kb.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
              <Link href={`/knowledge-bases/${kb.id}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{kb.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {kb.slug} · embedding model #{kb.embedding_model_id}
                </p>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(kb.id)}
                disabled={deleteKnowledgeBase.isPending}
              >
                Xoá
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      {deleteKnowledgeBase.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(deleteKnowledgeBase.error)}</p>
      )}
    </div>
  );
}
