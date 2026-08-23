import { AgentDetailView } from '@/features/agent';
import { PageShell } from '@/components/layout/PageShell';

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageShell title={`Agent #${id}`}>
      <AgentDetailView id={Number(id)} />
    </PageShell>
  );
}
