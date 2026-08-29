import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TableCell, TableRow } from '@/components/ui/table';

import type { KnowledgeBase } from '../types/knowledge-base.types';

interface Props {
  kb: KnowledgeBase;
  embeddingModelName: string;
  onDelete: () => void;
  isDeleting: boolean;
}

export function KnowledgeBaseRow({ kb, embeddingModelName, onDelete, isDeleting }: Props) {
  return (
    <TableRow className="group">
      <TableCell className="max-w-0">
        <Link href={`/knowledge-bases/${kb.id}`} className="block">
          <p className="truncate text-sm font-medium text-foreground">{kb.name}</p>
          <p className="truncate text-xs text-muted-foreground">{kb.slug}</p>
        </Link>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{embeddingModelName}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(kb.updated_at).toLocaleDateString('vi-VN')}
      </TableCell>
      <TableCell className="text-right">
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100">
              Xoá
            </Button>
          }
          title={`Xoá knowledge base "${kb.name}"?`}
          description="Toàn bộ folder/file/chunk bên trong cũng sẽ bị xoá."
          onConfirm={onDelete}
          isPending={isDeleting}
        />
      </TableCell>
    </TableRow>
  );
}
