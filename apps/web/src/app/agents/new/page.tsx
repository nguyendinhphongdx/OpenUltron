'use client';

import { useRouter } from 'next/navigation';

import { AgentForm } from '@/features/agent';

export default function NewAgentPage() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-lg font-semibold">Agent mới</h1>
      <AgentForm onSuccess={(agent) => router.push(`/agents/${agent.id}`)} />
    </main>
  );
}
