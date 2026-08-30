'use client';

import { BookOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { MultiSelectAssignDialog } from '@/components/shared/MultiSelectAssignDialog';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { getApiErrorMessage } from '@/lib/api';

import { useAgentKnowledgeBases } from '../hooks/useAgentKnowledgeBases';
import { useAssignKnowledgeBase } from '../hooks/useAssignKnowledgeBase';
import { useKnowledgeBases } from '../hooks/useKnowledgeBases';
import { useUnassignKnowledgeBase } from '../hooks/useUnassignKnowledgeBase';

interface AgentKnowledgeBaseManagerProps {
  agentId: number;
}

export function AgentKnowledgeBaseManager({ agentId }: AgentKnowledgeBaseManagerProps) {
  const { data: agentKnowledgeBases, isPending, isError } = useAgentKnowledgeBases(agentId);
  const { data: allKnowledgeBases } = useKnowledgeBases();
  const assignKnowledgeBase = useAssignKnowledgeBase(agentId);
  const unassignKnowledgeBase = useUnassignKnowledgeBase(agentId);

  const assignedKbIds = new Set(agentKnowledgeBases?.map((kb) => kb.id));
  const candidateKnowledgeBases =
    allKnowledgeBases?.filter((candidate) => !assignedKbIds.has(candidate.id)) ?? [];

  const handleAssign = async (ids: number[]) => {
    await Promise.all(ids.map((id) => assignKnowledgeBase.mutateAsync(id)));
  };

  const handleRemove = (id: number) => {
    unassignKnowledgeBase.mutate(id);
  };

  return (
    <div className="flex flex-col gap-3">
      {isPending && <LoadingState label="Đang tải knowledge base…" />}
      {isError && (
        <EmptyState icon={BookOpen} tone="destructive" title="Không tải được danh sách knowledge base." />
      )}

      {agentKnowledgeBases && agentKnowledgeBases.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {agentKnowledgeBases.map((kb) => (
            <li key={kb.id} className="flex items-center justify-between px-3 py-2 text-sm text-foreground">
              <span>
                {kb.name} <span className="text-muted-foreground">({kb.slug})</span>
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRemove(kb.id)}
                disabled={unassignKnowledgeBase.isPending}
              >
                ✕
              </Button>
            </li>
          ))}
        </ul>
      )}
      {agentKnowledgeBases && agentKnowledgeBases.length === 0 && (
        <EmptyState icon={BookOpen} title="Chưa có knowledge base nào được gán" />
      )}

      <div>
        <MultiSelectAssignDialog
          triggerLabel="+ Gán knowledge base"
          dialogTitle="Gán knowledge base cho agent"
          items={candidateKnowledgeBases}
          getId={(kb) => kb.id}
          getLabel={(kb) => `${kb.name} (${kb.slug})`}
          onConfirm={handleAssign}
          isPending={assignKnowledgeBase.isPending}
          emptyMessage="Không còn knowledge base nào để gán."
          error={assignKnowledgeBase.isError ? getApiErrorMessage(assignKnowledgeBase.error) : undefined}
        />
      </div>

      {unassignKnowledgeBase.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(unassignKnowledgeBase.error)}</p>
      )}
    </div>
  );
}
