'use client';

import { useState } from 'react';

import { Wrench } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [toolId, setToolId] = useState('');

  const assignedToolIds = new Set(agentTools?.map((t) => t.id));
  const candidateTools = allTools?.filter((candidate) => !assignedToolIds.has(candidate.id));

  const handleAdd = () => {
    if (!toolId) return;
    assignTool.mutate(Number(toolId), {
      onSuccess: () => setToolId(''),
    });
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

      <div className="flex items-center gap-2">
        <Select value={toolId || null} onValueChange={(v) => setToolId(v ?? '')}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="— Chọn tool —">
              {(value: string | null) => {
                const candidate = candidateTools?.find((c) => c.id.toString() === value);
                return candidate ? `${candidate.name} (${candidate.slug})` : '— Chọn tool —';
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {candidateTools?.map((candidate) => (
              <SelectItem key={candidate.id} value={candidate.id.toString()}>
                {candidate.name} ({candidate.slug})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleAdd} disabled={!toolId || assignTool.isPending}>
          {assignTool.isPending ? 'Đang gán…' : '+ Gán tool'}
        </Button>
      </div>

      {assignTool.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(assignTool.error)}</p>
      )}
      {unassignTool.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(unassignTool.error)}</p>
      )}
    </div>
  );
}
