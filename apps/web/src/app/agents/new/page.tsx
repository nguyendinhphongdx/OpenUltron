'use client';

import { useRouter } from 'next/navigation';

import { AgentForm } from '@/features/agent';
import { PageShell } from '@/components/layout/PageShell';

export default function NewAgentPage() {
  const router = useRouter();

  return (
    <PageShell title="Agent mới">
      <AgentForm onSuccess={(agent) => router.push(`/agents/${agent.id}`)} />
    </PageShell>
  );
}
