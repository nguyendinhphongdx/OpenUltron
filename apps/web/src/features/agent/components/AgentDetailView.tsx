'use client';

import { Bot, BookOpen, Settings, Users, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { getApiErrorMessage } from '@/lib/api';
import { AgentToolManager, useAgentTools } from '@/features/tool';
import { AgentKnowledgeBaseManager, useAgentKnowledgeBases } from '@/features/knowledge-base';
import { useModels } from '@/features/model';

import { useAgent } from '../hooks/useAgent';
import { useDeleteAgent } from '../hooks/useDeleteAgent';
import { useSubAgents } from '../hooks/useSubAgents';
import { AgentForm } from './AgentForm';
import { DelegationManager } from './DelegationManager';

export function AgentDetailView({ id }: { id: number }) {
  const router = useRouter();
  const { data: agent, isPending, isError } = useAgent(id);
  const deleteAgent = useDeleteAgent();

  const { data: models } = useModels();
  const { data: agentTools } = useAgentTools(id);
  const { data: agentKnowledgeBases } = useAgentKnowledgeBases(id);
  const { data: subAgents } = useSubAgents(id);

  if (isPending) return <LoadingState label="Đang tải agent…" />;
  if (isError || !agent) {
    return <EmptyState icon={Bot} tone="destructive" title="Không tải được agent." />;
  }

  const model = models?.find((m) => m.id === agent.model_id);

  const handleDelete = () => {
    if (!window.confirm(`Xoá agent "${agent.name}"? Hành động này không thể hoàn tác.`)) return;
    deleteAgent.mutate(agent.id, {
      onSuccess: () => router.push('/agents'),
    });
  };

  const readinessItems = [
    {
      key: 'model',
      label: 'Model',
      ok: Boolean(model),
      value: model ? `${model.name}` : '—',
    },
    {
      key: 'tools',
      label: 'Tool',
      ok: Boolean(agentTools && agentTools.length > 0),
      value: (agentTools?.length ?? 0).toString(),
    },
    {
      key: 'kbs',
      label: 'Knowledge Base',
      ok: Boolean(agentKnowledgeBases && agentKnowledgeBases.length > 0),
      value: (agentKnowledgeBases?.length ?? 0).toString(),
    },
    {
      key: 'sub-agents',
      label: 'Sub-agent',
      ok: Boolean(agent.is_orchestrator && subAgents && subAgents.length > 0),
      value: agent.is_orchestrator ? (subAgents?.length ?? 0).toString() : 'n/a',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
      <aside className="h-fit rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bot className="size-5" />
        </div>
        <h2 className="text-base font-semibold text-foreground">{agent.name}</h2>
        <p className="mb-4 font-mono text-xs text-muted-foreground">
          {agent.slug}
          {agent.is_orchestrator && ' · orchestrator'}
        </p>

        <div className="flex flex-col gap-2">
          {readinessItems.map((item) => (
            <div key={item.key} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={
                  'size-1.5 shrink-0 rounded-full ' + (item.ok ? 'bg-emerald-500' : 'bg-muted-foreground/40')
                }
              />
              <span>{item.label}</span>
              <span className="ml-auto font-mono text-[11px]">{item.value}</span>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex flex-col gap-4">
        <Tabs defaultValue="info" className="rounded-xl border border-border bg-card">
          <TabsList className="w-full justify-start gap-1 rounded-t-xl rounded-b-none border-b border-border bg-muted/30 p-2">
            <TabsTrigger value="info" className="gap-1.5">
              <Settings className="size-4" />
              Thông tin
            </TabsTrigger>
            <TabsTrigger value="kb" className="gap-1.5">
              <BookOpen className="size-4" />
              Knowledge Base
              <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                {agentKnowledgeBases?.length ?? 0}
              </span>
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-1.5">
              <Wrench className="size-4" />
              Tool
              <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                {agentTools?.length ?? 0}
              </span>
            </TabsTrigger>
            <TabsTrigger value="sub-agents" className="gap-1.5">
              <Users className="size-4" />
              Sub-agent
              {agent.is_orchestrator && (
                <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                  {subAgents?.length ?? 0}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="p-4">
            <AgentForm agent={agent} />
          </TabsContent>

          <TabsContent value="kb" className="p-4">
            <AgentKnowledgeBaseManager agentId={agent.id} />
          </TabsContent>

          <TabsContent value="tools" className="p-4">
            <AgentToolManager agentId={agent.id} />
          </TabsContent>

          <TabsContent value="sub-agents" className="p-4">
            {/* DelegationManager tự hiện hint "bật Là orchestrator" khi !is_orchestrator — không
                ẩn hẳn tab này, giữ đúng hành vi cũ (regression phát hiện qua code-reviewer). */}
            <DelegationManager agent={agent} />
          </TabsContent>
        </Tabs>

        <div className="border-t border-border pt-4">
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
        </div>
      </div>
    </div>
  );
}
