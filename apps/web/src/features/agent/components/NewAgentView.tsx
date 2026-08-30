'use client';

import { PageShell } from '@/components/layout/PageShell';

import { AgentCreationWizard } from './AgentCreationWizard';

export function NewAgentView() {
  return (
    <PageShell title="Agent mới">
      <AgentCreationWizard />
    </PageShell>
  );
}
