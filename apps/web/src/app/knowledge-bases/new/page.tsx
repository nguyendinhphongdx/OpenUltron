'use client';

import { useRouter } from 'next/navigation';

import { KnowledgeBaseForm } from '@/features/knowledge-base/components/KnowledgeBaseForm';
import { PageShell } from '@/components/layout/PageShell';

export default function NewKnowledgeBasePage() {
  const router = useRouter();

  return (
    <PageShell title="Knowledge Base mới">
      <KnowledgeBaseForm onSuccess={(kb) => router.push(`/knowledge-bases/${kb.id}`)} />
    </PageShell>
  );
}
