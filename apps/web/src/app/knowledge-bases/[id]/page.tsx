import { KnowledgeBaseFilesView } from '@/features/knowledge-base';

export default async function KnowledgeBaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <KnowledgeBaseFilesView kbId={Number(id)} />;
}
