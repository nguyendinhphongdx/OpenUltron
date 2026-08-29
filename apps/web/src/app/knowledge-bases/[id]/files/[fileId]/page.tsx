import { KnowledgeFileDetailView } from '@/features/knowledge-base';

export default async function KnowledgeFileDetailPage({
  params,
}: {
  params: Promise<{ id: string; fileId: string }>;
}) {
  const { id, fileId } = await params;
  return <KnowledgeFileDetailView kbId={Number(id)} fileId={Number(fileId)} />;
}
