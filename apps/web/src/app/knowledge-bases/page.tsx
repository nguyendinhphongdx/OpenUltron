import Link from 'next/link';
import { Plus } from 'lucide-react';

import { KnowledgeBaseList } from '@/features/knowledge-base/components/KnowledgeBaseList';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/layout/PageShell';

export default function KnowledgeBasesPage() {
  return (
    <PageShell
      title="Knowledge base"
      action={
        <Button size="sm" render={<Link href="/knowledge-bases/new" />}>
          <Plus data-icon="inline-start" />
          Knowledge Base mới
        </Button>
      }
    >
      <KnowledgeBaseList />
    </PageShell>
  );
}
