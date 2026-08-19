import Link from 'next/link';

import { KnowledgeBaseList } from '@/features/knowledge-base/components/KnowledgeBaseList';

export default function KnowledgeBasesPage() {
  return (
    <main className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <h1 className="text-lg font-semibold">Knowledge base</h1>
        <Link
          href="/knowledge-bases/new"
          className="inline-flex h-8 items-center justify-center rounded-md bg-accent px-3 text-xs font-medium text-white hover:opacity-90"
        >
          + Knowledge Base mới
        </Link>
      </div>
      <KnowledgeBaseList />
    </main>
  );
}
