'use client';

import { useRouter } from 'next/navigation';

import { PageShell } from '@/components/layout/PageShell';

import { AgentForm } from './AgentForm';

export function NewAgentView() {
  const router = useRouter();

  return (
    <PageShell title="Agent mới">
      <AgentForm onSuccess={(agent) => router.push(`/agents/${agent.id}`)} />
    </PageShell>
  );
}
