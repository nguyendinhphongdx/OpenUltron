'use client';

import { Wrench } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { MultiSelectAssignDialog } from '@/components/shared/MultiSelectAssignDialog';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { getApiErrorMessage } from '@/lib/api';

import { useAgentTools } from '../hooks/useAgentTools';
import { useAssignTool } from '../hooks/useAssignTool';
import { useTools } from '../hooks/useTools';
import { useUnassignTool } from '../hooks/useUnassignTool';

interface AgentToolManagerProps {
  agentId: number;
}

export function AgentToolManager({ agentId }: AgentToolManagerProps) {
  const { data: agentTools, isPending, isError } = useAgentTools(agentId);
  const { data: allTools } = useTools();
  const assignTool = useAssignTool(agentId);
  const unassignTool = useUnassignTool(agentId);

  const assignedToolIds = new Set(agentTools?.map((t) => t.id));
  const candidateTools = allTools?.filter((candidate) => !assignedToolIds.has(candidate.id)) ?? [];

  const handleAssign = async (ids: number[]) => {
    await Promise.all(ids.map((id) => assignTool.mutateAsync(id)));
  };

  const handleRemove = (id: number) => {
    unassignTool.mutate(id);
  };

  return (
    <div className="flex flex-col gap-3">
      {isPending && <LoadingState label="Đang tải tool…" />}
      {isError && <EmptyState icon={Wrench} tone="destructive" title="Không tải được danh sách tool." />}

      {agentTools && agentTools.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {agentTools.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-3 py-2 text-sm text-foreground">
              <span>
                {t.name} <span className="text-muted-foreground">({t.slug})</span>
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRemove(t.id)}
                disabled={unassignTool.isPending}
              >
                ✕
              </Button>
            </li>
          ))}
        </ul>
      )}
      {agentTools && agentTools.length === 0 && (
        <EmptyState icon={Wrench} title="Chưa có tool nào được gán" />
      )}

      <div>
        <MultiSelectAssignDialog
          triggerLabel="+ Gán tool"
          dialogTitle="Gán tool cho agent"
          items={candidateTools}
          getId={(t) => t.id}
          getLabel={(t) => `${t.name} (${t.slug})`}
          onConfirm={handleAssign}
          isPending={assignTool.isPending}
          emptyMessage="Không còn tool nào để gán."
          error={assignTool.isError ? getApiErrorMessage(assignTool.error) : undefined}
        />
      </div>

      {unassignTool.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(unassignTool.error)}</p>
      )}
    </div>
  );
}
