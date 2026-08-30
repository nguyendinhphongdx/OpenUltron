'use client';

import { useRouter } from 'next/navigation';

import { PageShell } from '@/components/layout/PageShell';

import { KnowledgeBaseForm } from './KnowledgeBaseForm';

export function NewKnowledgeBaseView() {
  const router = useRouter();

  return (
    <PageShell title="Knowledge Base mới">
      <KnowledgeBaseForm onSuccess={(kb) => router.push(`/knowledge-bases/${kb.id}`)} />
    </PageShell>
  );
}
