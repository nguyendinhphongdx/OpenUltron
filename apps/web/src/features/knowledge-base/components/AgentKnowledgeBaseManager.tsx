'use client';

import { useState } from 'react';

import { BookOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [kbId, setKbId] = useState('');

  const assignedKbIds = new Set(agentKnowledgeBases?.map((kb) => kb.id));
  const candidateKnowledgeBases = allKnowledgeBases?.filter((candidate) => !assignedKbIds.has(candidate.id));

  const handleAdd = () => {
    if (!kbId) return;
    assignKnowledgeBase.mutate(Number(kbId), {
      onSuccess: () => setKbId(''),
    });
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

      <div className="flex items-center gap-2">
        <Select value={kbId || null} onValueChange={(v) => setKbId(v ?? '')}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="— Chọn knowledge base —">
              {(value: string | null) => {
                const candidate = candidateKnowledgeBases?.find((c) => c.id.toString() === value);
                return candidate ? `${candidate.name} (${candidate.slug})` : '— Chọn knowledge base —';
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {candidateKnowledgeBases?.map((candidate) => (
              <SelectItem key={candidate.id} value={candidate.id.toString()}>
                {candidate.name} ({candidate.slug})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleAdd} disabled={!kbId || assignKnowledgeBase.isPending}>
          {assignKnowledgeBase.isPending ? 'Đang gán…' : '+ Gán knowledge base'}
        </Button>
      </div>

      {assignKnowledgeBase.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(assignKnowledgeBase.error)}</p>
      )}
      {unassignKnowledgeBase.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(unassignKnowledgeBase.error)}</p>
      )}
    </div>
  );
}
