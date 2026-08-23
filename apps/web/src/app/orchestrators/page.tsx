'use client';

import Link from 'next/link';
import { Workflow } from 'lucide-react';

import { useAgents } from '@/features/agent';
import { Card } from '@/components/ui/card';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { PageShell } from '@/components/layout/PageShell';

export default function OrchestratorsPage() {
  const { data, isPending, isError } = useAgents();
  const orchestrators = data?.filter((a) => a.is_orchestrator) ?? [];

  return (
    <PageShell
      title="Orchestrators"
      description="Canvas graph cho agent có is_orchestrator=true — xem/sửa quan hệ delegate với sub-agent (đa tầng)."
    >
      {isPending && <LoadingState label="Đang tải…" />}
      {isError && <EmptyState icon={Workflow} tone="destructive" title="Không tải được danh sách agent." />}
      {!isPending && !isError && orchestrators.length === 0 && (
        <EmptyState
          icon={Workflow}
          title="Chưa có orchestrator nào"
          description="Đánh dấu is_orchestrator=true ở trang Agents để tạo 1 orchestrator."
        />
      )}
      {!isPending && !isError && orchestrators.length > 0 && (
        <Card className="py-0">
          <ul className="divide-y divide-border">
            {orchestrators.map((agent) => (
              <li key={agent.id}>
                <Link
                  href={`/orchestrators/${agent.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{agent.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{agent.slug}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">Mở canvas →</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </PageShell>
  );
}
