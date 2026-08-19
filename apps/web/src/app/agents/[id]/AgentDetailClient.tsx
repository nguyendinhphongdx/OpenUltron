'use client';

import { useRouter } from 'next/navigation';

import { AgentForm, DelegationManager, useAgent, useDeleteAgent } from '@/features/agent';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api';

export function AgentDetailClient({ id }: { id: number }) {
  const router = useRouter();
  const { data: agent, isPending, isError } = useAgent(id);
  const deleteAgent = useDeleteAgent();

  if (isPending) return <p className="p-4 text-sm text-foreground/60">Đang tải agent…</p>;
  if (isError || !agent) return <p className="p-4 text-sm text-red-500">Không tải được agent.</p>;

  const handleDelete = () => {
    if (!window.confirm(`Xoá agent "${agent.name}"? Hành động này không thể hoàn tác.`)) return;
    deleteAgent.mutate(agent.id, {
      onSuccess: () => router.push('/agents'),
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-4 text-sm font-semibold text-foreground/60">Thông tin agent</h2>
        <AgentForm agent={agent} />
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-foreground/60">Sub-agent</h2>
        <DelegationManager agent={agent} />
      </section>

      <section className="border-t border-border pt-4">
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={deleteAgent.isPending}
          className="border-red-500 text-red-500 hover:bg-red-500/10"
        >
          {deleteAgent.isPending ? 'Đang xoá…' : 'Xoá agent'}
        </Button>
        {deleteAgent.isError && (
          <p className="mt-2 text-sm text-red-500">{getApiErrorMessage(deleteAgent.error)}</p>
        )}
      </section>
    </div>
  );
}
