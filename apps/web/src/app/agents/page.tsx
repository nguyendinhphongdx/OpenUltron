import Link from 'next/link';
import { Plus } from 'lucide-react';

import { AgentList } from '@/features/agent';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/layout/PageShell';

export default function AgentsPage() {
  return (
    <PageShell
      title="Agent"
      description="Agent gắn 1 model, có thể có tool/knowledge base riêng."
      action={
        <Button size="sm" render={<Link href="/agents/new" />}>
          <Plus data-icon="inline-start" />
          Agent mới
        </Button>
      }
    >
      <AgentList />
    </PageShell>
  );
}
