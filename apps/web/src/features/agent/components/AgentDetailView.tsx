'use client';

import { Bot } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { getApiErrorMessage } from '@/lib/api';
import { AgentToolManager } from '@/features/tool';

import { useAgent } from '../hooks/useAgent';
import { useDeleteAgent } from '../hooks/useDeleteAgent';
import { AgentForm } from './AgentForm';
import { DelegationManager } from './DelegationManager';

export function AgentDetailView({ id }: { id: number }) {
  const router = useRouter();
  const { data: agent, isPending, isError } = useAgent(id);
  const deleteAgent = useDeleteAgent();

  if (isPending) return <LoadingState label="Đang tải agent…" />;
  if (isError || !agent) {
    return <EmptyState icon={Bot} tone="destructive" title="Không tải được agent." />;
  }

  const handleDelete = () => {
    if (!window.confirm(`Xoá agent "${agent.name}"? Hành động này không thể hoàn tác.`)) return;
    deleteAgent.mutate(agent.id, {
      onSuccess: () => router.push('/agents'),
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Thông tin agent</h2>
        <AgentForm agent={agent} />
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Sub-agent</h2>
        <DelegationManager agent={agent} />
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Tool</h2>
        <AgentToolManager agentId={agent.id} />
      </section>

      <section className="border-t border-border pt-4">
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={deleteAgent.isPending}
          className="border-destructive text-destructive hover:bg-destructive/10"
        >
          {deleteAgent.isPending ? 'Đang xoá…' : 'Xoá agent'}
        </Button>
        {deleteAgent.isError && (
          <p className="mt-2 text-sm text-destructive">{getApiErrorMessage(deleteAgent.error)}</p>
        )}
      </section>
    </div>
  );
}
