import Link from 'next/link';

import { AgentList } from '@/features/agent';
import { Button } from '@/components/ui/button';

export default function AgentsPage() {
  return (
    <main className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <h1 className="text-lg font-semibold">Agent</h1>
        <Button size="sm" asChild>
          <Link href="/agents/new">+ Agent mới</Link>
        </Button>
      </div>
      <AgentList />
    </main>
  );
}
