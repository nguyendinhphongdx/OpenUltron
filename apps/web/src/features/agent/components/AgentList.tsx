'use client';

import Link from 'next/link';
import { Bot } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { getApiErrorMessage } from '@/lib/api';

import { useAgents } from '../hooks/useAgents';
import { useDeleteAgent } from '../hooks/useDeleteAgent';

export function AgentList() {
  const { data, isPending, isError } = useAgents();
  const deleteAgent = useDeleteAgent();

  if (isPending) return <LoadingState label="Đang tải agent…" />;
  if (isError) {
    return <EmptyState icon={Bot} tone="destructive" title="Không tải được danh sách agent." />;
  }
  if (data.length === 0) {
    return <EmptyState icon={Bot} title="Chưa có agent nào" description="Tạo agent đầu tiên để bắt đầu." />;
  }

  const handleDelete = (id: number, name: string) => {
    if (!window.confirm(`Xoá agent "${name}"?`)) return;
    deleteAgent.mutate(id);
  };

  return (
    <div className="space-y-3">
      <Card className="py-0">
        <ul className="divide-y divide-border">
          {data.map((agent) => (
            <li key={agent.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
              <Link href={`/agents/${agent.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{agent.name}</p>
                  {agent.is_orchestrator && (
                    <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                      orchestrator
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {agent.slug} · model #{agent.model_id}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" variant="outline" render={<Link href={`/agents/${agent.id}`} />}>
                  Sửa
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
      </Card>
      {deleteAgent.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(deleteAgent.error)}</p>
      )}
    </div>
  );
}
