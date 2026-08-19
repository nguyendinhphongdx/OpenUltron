'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api';

import { useDeleteKnowledgeBase } from '../hooks/useDeleteKnowledgeBase';
import { useKnowledgeBases } from '../hooks/useKnowledgeBases';

export function KnowledgeBaseList() {
  const { data: knowledgeBases, isPending, isError } = useKnowledgeBases();
  const deleteKnowledgeBase = useDeleteKnowledgeBase();

  if (isPending) return <p className="p-4 text-sm text-foreground/60">Đang tải knowledge base…</p>;
  if (isError) return <p className="p-4 text-sm text-red-500">Không tải được danh sách knowledge base.</p>;
  if (knowledgeBases.length === 0) {
    return <p className="p-4 text-sm text-foreground/60">Chưa có knowledge base nào.</p>;
  }

  const handleDelete = (id: number) => {
    if (!window.confirm('Xoá knowledge base này?')) return;
    deleteKnowledgeBase.mutate(id);
  };

  return (
    <ul className="divide-y divide-border">
      {knowledgeBases.map((kb) => (
        <li key={kb.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href={`/knowledge-bases/${kb.id}`} className="flex-1 hover:opacity-80">
            <p className="text-sm font-medium">{kb.name}</p>
            <p className="text-xs text-foreground/60">
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
      {deleteKnowledgeBase.isError && (
        <li className="px-4 py-2 text-sm text-red-500">
          {getApiErrorMessage(deleteKnowledgeBase.error)}
        </li>
      )}
    </ul>
  );
}
