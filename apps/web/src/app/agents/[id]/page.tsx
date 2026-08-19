import { AgentDetailClient } from './AgentDetailClient';

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-lg font-semibold">Agent #{id}</h1>
      <AgentDetailClient id={Number(id)} />
    </main>
  );
}
