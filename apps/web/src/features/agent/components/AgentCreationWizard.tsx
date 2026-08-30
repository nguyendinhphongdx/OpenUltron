'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { AgentToolManager } from '@/features/tool';
import { AgentKnowledgeBaseManager } from '@/features/knowledge-base';
import { cn } from '@/lib/utils';

import type { Agent } from '../types/agent.types';
import { AgentForm } from './AgentForm';
import { DelegationManager } from './DelegationManager';

interface StepDefinition {
  id: number;
  label: string;
}

const BASE_STEPS: StepDefinition[] = [
  { id: 1, label: 'Định danh & Model' },
  { id: 2, label: 'Tool' },
  { id: 3, label: 'Knowledge Base' },
];

const ORCHESTRATOR_STEP: StepDefinition = { id: 4, label: 'Sub-agent' };

/**
 * Wizard tạo Agent mới — bước 1 gọi `POST /agents` thật ngay (persist), các bước sau gán resource
 * (Tool/Knowledge Base/Sub-agent) tuần tự qua API sẵn có. Xem
 * docs/features/agent-creation-wizard.md — "Câu hỏi mở — đã trả lời" #3.
 */
export function AgentCreationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [createdAgent, setCreatedAgent] = useState<Agent | null>(null);

  const steps = createdAgent?.is_orchestrator ? [...BASE_STEPS, ORCHESTRATOR_STEP] : BASE_STEPS;
  const lastStepId = steps[steps.length - 1].id;

  const handleCreated = (agent: Agent) => {
    setCreatedAgent(agent);
    setStep(2);
  };

  const goToNext = () => {
    if (step >= lastStepId) {
      router.push(`/agents/${createdAgent?.id}`);
      return;
    }
    setStep(step + 1);
  };

  const goToPrevious = () => {
    setStep(Math.max(1, step - 1));
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/30">
        <p className="text-sm font-medium text-foreground">Tạo agent mới</p>
        <p className="text-xs text-muted-foreground">
          {step === 1
            ? 'Bước 1 — thiết lập định danh và model cho agent'
            : `Bước ${step}/${lastStepId} — bạn có thể bỏ qua bước này và gán sau ở trang chi tiết`}
        </p>
      </CardHeader>

      <div className="flex items-center gap-0 px-6 pt-4">
        {steps.map((s, index) => (
          <div key={s.id} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                  s.id < step && 'border-primary bg-primary text-primary-foreground',
                  s.id === step && 'border-primary bg-primary/10 text-primary',
                  s.id > step && 'border-border bg-background text-muted-foreground',
                )}
              >
                {s.id < step ? '✓' : s.id}
              </div>
              <span
                className={cn(
                  'text-xs',
                  s.id === step ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
              >
                {s.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn('mx-3 h-px w-8', s.id < step ? 'bg-primary/50' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      <CardContent className="min-h-[280px] pt-4">
        {step === 1 && (
          <div>
            <p className="mb-1 text-sm font-semibold text-foreground">Định danh & Model</p>
            <p className="mb-4 text-xs text-muted-foreground">
              Slug/tên/mô tả/system prompt/model — tạo xong sẽ chuyển sang các bước gán Tool/Knowledge
              Base/Sub-agent.
            </p>
            <AgentForm onSuccess={handleCreated} />
          </div>
        )}

        {step === 2 && createdAgent && (
          <div>
            <p className="mb-1 text-sm font-semibold text-foreground">Gán Tool</p>
            <p className="mb-4 max-w-[60ch] text-xs text-muted-foreground">
              Chọn 1 hoặc nhiều tool có sẵn để agent dùng khi trả lời. Có thể bỏ qua và gán sau ở trang
              chi tiết.
            </p>
            <AgentToolManager agentId={createdAgent.id} />
          </div>
        )}

        {step === 3 && createdAgent && (
          <div>
            <p className="mb-1 text-sm font-semibold text-foreground">Gán Knowledge Base</p>
            <p className="mb-4 max-w-[60ch] text-xs text-muted-foreground">
              Chọn 1 hoặc nhiều Knowledge Base có sẵn để agent tự động dùng RAG khi trả lời — backend tự
              expose tool tìm kiếm cho mỗi KB được gán.
            </p>
            <AgentKnowledgeBaseManager agentId={createdAgent.id} />
          </div>
        )}

        {step === 4 && createdAgent && createdAgent.is_orchestrator && (
          <div>
            <p className="mb-1 text-sm font-semibold text-foreground">Gán Sub-agent</p>
            <p className="mb-4 max-w-[60ch] text-xs text-muted-foreground">
              Chọn agent khác để agent này (orchestrator) có thể uỷ quyền công việc.
            </p>
            <DelegationManager agent={createdAgent} />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t bg-muted/30">
        <Button variant="ghost" size="sm" onClick={goToPrevious} disabled={step <= 1}>
          ← Quay lại
        </Button>
        {step === 1 ? (
          <p className="text-xs text-muted-foreground">Tạo agent để tiếp tục sang bước gán Tool.</p>
        ) : (
          <div className="flex items-center gap-2">
            {step < lastStepId && (
              <Button variant="outline" size="sm" onClick={goToNext}>
                Bỏ qua bước này
              </Button>
            )}
            <Button size="sm" onClick={goToNext}>
              {step >= lastStepId ? 'Hoàn tất' : 'Tiếp tục →'}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
