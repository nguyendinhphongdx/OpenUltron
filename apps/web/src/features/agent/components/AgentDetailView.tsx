'use client';

import { Bot, BookOpen, Settings, Users, Wrench } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { OrchestratorCanvas } from './OrchestratorCanvas';

type AgentDetailTab = 'info' | 'kb' | 'tools' | 'sub-agents';

const TAB_VALUES: AgentDetailTab[] = ['info', 'kb', 'tools', 'sub-agents'];

function isAgentDetailTab(value: string | null): value is AgentDetailTab {
  return TAB_VALUES.includes(value as AgentDetailTab);
}

export function AgentDetailView({ id }: { id: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = isAgentDetailTab(searchParams.get('tab')) ? (searchParams.get('tab') as AgentDetailTab) : 'info';
  const setActiveTab = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

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
        <div className="rounded-xl border border-border bg-card">
          {/* `Tabs` chỉ dùng cho phần điều hướng (TabsList/TabsTrigger, giữ keyboard nav/ARIA) —
              nội dung mỗi tab tự render theo `activeTab` bên dưới thay vì qua `TabsContent`:
              `TabsContent` (base-ui) mặc định chờ transition-detection trước khi tháo mount panel
              cũ, gây hiệu ứng "tab cũ còn hiện 1 lúc" khi chuyển — feedback thật từ user. Render
              tay đảm bảo chỉ đúng 1 tab được mount tại 1 thời điểm, không delay. */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as string)}>
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
          </Tabs>

          <div className="p-4">
            {activeTab === 'info' && <AgentForm agent={agent} />}
            {activeTab === 'kb' && <AgentKnowledgeBaseManager agentId={agent.id} />}
            {activeTab === 'tools' && <AgentToolManager agentId={agent.id} />}
            {activeTab === 'sub-agents' &&
              (agent.is_orchestrator ? (
                // Canvas thay list add/remove phẳng khi agent thật sự là orchestrator — feedback
                // user: xem/sửa cây sub-agent trực quan hợp lý hơn. `-m-4` bù lại padding của
                // wrapper cha (canvas tự có layout/border riêng, không cần thêm padding lồng).
                <div className="-m-4 h-[560px] overflow-hidden rounded-b-xl">
                  <OrchestratorCanvas rootAgentId={agent.id} heightClassName="h-full" />
                </div>
              ) : (
                // Không phải orchestrator: DelegationManager tự hiện hint "bật Là orchestrator".
                <DelegationManager agent={agent} />
              ))}
          </div>
        </div>

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
