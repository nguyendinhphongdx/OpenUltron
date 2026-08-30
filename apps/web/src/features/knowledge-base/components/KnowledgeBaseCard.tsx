import Link from 'next/link';
import { BookOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatDate } from '@/lib/format';

import type { KnowledgeBase } from '../types/knowledge-base.types';

interface Props {
  kb: KnowledgeBase;
  embeddingModelName: string;
  onDelete: () => void;
  isDeleting: boolean;
}

export function KnowledgeBaseCard({ kb, embeddingModelName, onDelete, isDeleting }: Props) {
  return (
    <Card className="group relative flex flex-col gap-2 p-4 transition-shadow hover:shadow-md">
      <Link href={`/knowledge-bases/${kb.id}`} className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpen className="size-4" />
          </div>
          <p className="truncate text-sm font-semibold text-foreground">{kb.name}</p>
        </div>
        <p className="line-clamp-2 min-h-[2.5rem] text-xs text-muted-foreground">
          {kb.description || 'Chưa có mô tả.'}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{embeddingModelName}</span>
          <span>{formatDate(kb.updated_at)}</span>
        </div>
      </Link>
      <ConfirmDialog
        trigger={
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100"
          >
            Xoá
          </Button>
        }
        title={`Xoá knowledge base "${kb.name}"?`}
        description="Toàn bộ folder/file/chunk bên trong cũng sẽ bị xoá."
        onConfirm={onDelete}
        isPending={isDeleting}
      />
    </Card>
  );
}
