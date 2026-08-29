import { KnowledgeBaseSettingsView } from '@/features/knowledge-base';

export default async function KnowledgeBaseSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <KnowledgeBaseSettingsView kbId={Number(id)} />;
}
