'use client';

import { useState } from 'react';

import { Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { getApiErrorMessage } from '@/lib/api';

import { useAddDelegation } from '../hooks/useAddDelegation';
import { useAgents } from '../hooks/useAgents';
import { useSubAgents } from '../hooks/useSubAgents';
import type { Agent } from '../types/agent.types';

interface DelegationManagerProps {
  agent: Agent;
}

export function DelegationManager({ agent }: DelegationManagerProps) {
  const { data: subAgents, isPending, isError } = useSubAgents(agent.id);
  const { data: allAgents } = useAgents();
  const addDelegation = useAddDelegation(agent.id);
  const [subAgentId, setSubAgentId] = useState('');

  if (!agent.is_orchestrator) {
    return (
      <p className="text-sm text-muted-foreground">
        Agent này chưa được đánh dấu là orchestrator — bật &quot;Là orchestrator&quot; để quản lý sub-agent.
      </p>
    );
  }

  const existingSubAgentIds = new Set(subAgents?.map((sub) => sub.id));
  const candidateAgents = allAgents?.filter(
    (candidate) => candidate.id !== agent.id && !existingSubAgentIds.has(candidate.id),
  );

  const handleAdd = () => {
    if (!subAgentId) return;
    addDelegation.mutate(Number(subAgentId), {
      onSuccess: () => setSubAgentId(''),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {isPending && <LoadingState label="Đang tải sub-agent…" />}
      {isError && <EmptyState icon={Users} tone="destructive" title="Không tải được danh sách sub-agent." />}

      {subAgents && subAgents.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {subAgents.map((sub) => (
            <li key={sub.id} className="px-3 py-2 text-sm text-foreground">
              {sub.name} <span className="text-muted-foreground">({sub.slug})</span>
            </li>
          ))}
        </ul>
      )}
      {subAgents && subAgents.length === 0 && (
        <EmptyState icon={Users} title="Chưa có sub-agent nào" />
      )}

      <div className="flex items-center gap-2">
        <Select value={subAgentId || null} onValueChange={(v) => setSubAgentId(v ?? '')}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="— Chọn agent —" />
          </SelectTrigger>
          <SelectContent>
            {candidateAgents?.map((candidate) => (
              <SelectItem key={candidate.id} value={candidate.id.toString()}>
                {candidate.name} ({candidate.slug})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!subAgentId || addDelegation.isPending}
        >
          {addDelegation.isPending ? 'Đang thêm…' : '+ Thêm sub-agent'}
        </Button>
      </div>

      {addDelegation.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(addDelegation.error)}</p>
      )}
    </div>
  );
}
