'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api';

import { useAgents } from '../hooks/useAgents';
import { useDeleteAgent } from '../hooks/useDeleteAgent';

export function AgentList() {
  const { data, isPending, isError } = useAgents();
  const deleteAgent = useDeleteAgent();

  if (isPending) return <p className="p-4 text-sm text-foreground/60">Đang tải agent…</p>;
  if (isError) return <p className="p-4 text-sm text-red-500">Không tải được danh sách agent.</p>;
  if (data.length === 0) {
    return <p className="p-4 text-sm text-foreground/60">Chưa có agent nào.</p>;
  }

  const handleDelete = (id: number, name: string) => {
    if (!window.confirm(`Xoá agent "${name}"?`)) return;
    deleteAgent.mutate(id);
  };

  return (
    <div>
      <ul className="divide-y divide-border">
        {data.map((agent) => (
          <li key={agent.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-foreground/5">
            <Link href={`/agents/${agent.id}`} className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{agent.name}</p>
                {agent.is_orchestrator && (
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    orchestrator
                  </span>
                )}
              </div>
              <p className="text-xs text-foreground/60">
                {agent.slug} · model #{agent.model_id}
              </p>
            </Link>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/agents/${agent.id}`}>Sửa</Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(agent.id, agent.name)}
                disabled={deleteAgent.isPending}
              >
                Xoá
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {deleteAgent.isError && (
        <p className="px-4 py-2 text-sm text-red-500">{getApiErrorMessage(deleteAgent.error)}</p>
      )}
    </div>
  );
}
