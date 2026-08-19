import { OrchestratorCanvas } from '@/features/agent';

export default async function OrchestratorCanvasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrchestratorCanvas rootAgentId={Number(id)} />;
}
