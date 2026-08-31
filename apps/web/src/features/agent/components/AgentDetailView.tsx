'use client';

import { ArrowLeft, Bot, BookOpen, Cpu, Settings, Users, Wrench } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
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

// Dùng chung cho cả nội dung chính lẫn 2 trạng thái loading/error bên dưới — trước đó early-return
// loading/error mất hẳn padding này (do bỏ `PageShell`), khiến `LoadingState`/`EmptyState` dính
// sát mép màn hình (finding thật từ `code-reviewer`).
const PAGE_CONTAINER_CLASS = 'mx-auto flex min-h-full max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6';

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

  if (isPending) {
    return (
      <div className={PAGE_CONTAINER_CLASS}>
        <LoadingState label="Đang tải agent…" />
      </div>
    );
  }
  if (isError || !agent) {
    return (
      <div className={PAGE_CONTAINER_CLASS}>
        <EmptyState icon={Bot} tone="destructive" title="Không tải được agent." />
      </div>
    );
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
      icon: Cpu,
      label: 'Model',
      ok: Boolean(model),
      value: model ? model.name : 'Chưa gán model',
    },
    {
      key: 'tools',
      icon: Wrench,
      label: 'Tool đã gán',
      ok: Boolean(agentTools && agentTools.length > 0),
      value: `${agentTools?.length ?? 0} tool`,
    },
    {
      key: 'kbs',
      icon: BookOpen,
      label: 'Knowledge Base đã gán',
      ok: Boolean(agentKnowledgeBases && agentKnowledgeBases.length > 0),
      value: `${agentKnowledgeBases?.length ?? 0} KB`,
    },
    {
      key: 'sub-agents',
      icon: Users,
      label: 'Sub-agent đã gán',
      ok: Boolean(agent.is_orchestrator && subAgents && subAgents.length > 0),
      value: agent.is_orchestrator ? `${subAgents?.length ?? 0} sub-agent` : 'Không phải orchestrator',
    },
  ];

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      {/* Header — trước đây thông tin này (avatar/tên/slug/readiness) nằm ở 1 cột trái riêng,
          lặp lại giống hệt nhau ở cả 4 tab, tốn diện tích — feedback user: gộp lên đây, chỉ hiện
          1 lần. Thêm nút back (trước đó không có cách quay lại /agents ngoài nút trình duyệt).
          Readiness tách thành hàng riêng bên dưới (thay vì nhét chung 1 hàng với back/avatar/tên/
          nút xoá) — nhét chung phải ẩn hẳn dưới màn hình rộng (`xl:flex`) mới đủ chỗ, làm readiness
          biến mất hoàn toàn trên laptop/tablet (finding thật từ `code-reviewer`); hàng riêng +
          `flex-wrap` thì luôn hiện, tự xuống dòng khi hẹp thay vì biến mất. */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/70 px-5 py-4 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/agents')}
            aria-label="Quay lại danh sách agent"
            className="shrink-0"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bot className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{agent.name}</h1>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {agent.slug}
              {agent.is_orchestrator && ' · orchestrator'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleteAgent.isPending}
            className="shrink-0 border-destructive text-destructive hover:bg-destructive/10"
          >
            {deleteAgent.isPending ? 'Đang xoá…' : 'Xoá agent'}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 pt-3">
          {readinessItems.map((item) => (
            <div
              key={item.key}
              className={cn(
                'flex items-center gap-1.5 text-xs',
                item.ok ? 'text-foreground/70' : 'text-muted-foreground/60',
              )}
              title={item.label}
            >
              <item.icon className="size-3.5 shrink-0" />
              <span className="whitespace-nowrap">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
      {deleteAgent.isError && (
        <p className="-mt-2 text-sm text-destructive">{getApiErrorMessage(deleteAgent.error)}</p>
      )}

      <div className="flex flex-1 flex-col">
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
      </div>
    </div>
  );
}
