'use client';

import { useRouter } from 'next/navigation';

import { KnowledgeBaseForm } from '@/features/knowledge-base/components/KnowledgeBaseForm';

export default function NewKnowledgeBasePage() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-lg font-semibold">Knowledge Base mới</h1>
      <KnowledgeBaseForm onSuccess={(kb) => router.push(`/knowledge-bases/${kb.id}`)} />
    </main>
  );
}
