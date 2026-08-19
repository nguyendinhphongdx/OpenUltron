'use client';

import Link from 'next/link';

import { useAgents } from '@/features/agent';

export default function OrchestratorsPage() {
  const { data, isPending, isError } = useAgents();
  const orchestrators = data?.filter((a) => a.is_orchestrator) ?? [];

  return (
    <main className="mx-auto max-w-2xl">
      <div className="border-b border-border px-4 py-4">
        <h1 className="text-lg font-semibold">Orchestrators</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Canvas graph cho agent có <code className="font-mono text-xs">is_orchestrator=true</code> —
          xem/sửa quan hệ delegate với sub-agent (đa tầng).
        </p>
      </div>

      {isPending && <p className="p-4 text-sm text-foreground/60">Đang tải…</p>}
      {isError && <p className="p-4 text-sm text-red-500">Không tải được danh sách agent.</p>}
      {!isPending && !isError && orchestrators.length === 0 && (
        <p className="p-4 text-sm text-foreground/60">
          Chưa có agent nào đánh dấu is_orchestrator — tạo/sửa 1 agent ở trang Agents trước.
        </p>
      )}

      <ul className="divide-y divide-border">
        {orchestrators.map((agent) => (
          <li key={agent.id}>
            <Link
              href={`/orchestrators/${agent.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-foreground/5"
            >
              <div>
                <p className="text-sm font-medium">{agent.name}</p>
                <p className="text-xs text-foreground/60">{agent.slug}</p>
              </div>
              <span className="text-xs text-foreground/50">Mở canvas →</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
