import type { ReactNode } from 'react';

import { KnowledgeBaseDetailShell } from '@/features/knowledge-base';

export default async function KnowledgeBaseDetailLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  const { id } = await params;
  return <KnowledgeBaseDetailShell kbId={Number(id)}>{children}</KnowledgeBaseDetailShell>;
}
