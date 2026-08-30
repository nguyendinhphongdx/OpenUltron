'use client';

import { ShieldCheck } from 'lucide-react';
import {
  useAgUiInterrupts,
  useAgUiSubmitInterruptResponses,
  type AgUiInterrupt,
} from '@assistant-ui/react-ag-ui';

import { Button } from '@/components/ui/button';

function interruptToolName(interrupt: AgUiInterrupt) {
  const metadata = interrupt.metadata;
  if (metadata && typeof metadata.toolName === 'string') return metadata.toolName;
  return interrupt.toolCallId ?? 'unknown-tool';
}

function interruptArguments(interrupt: AgUiInterrupt) {
  const metadata = interrupt.metadata;
  if (metadata && 'arguments' in metadata) return metadata.arguments;
  return {};
}

export function ApprovalInterruptPanel() {
  const interrupts = useAgUiInterrupts();
  const submitInterruptResponses = useAgUiSubmitInterruptResponses();

  if (interrupts.length === 0) return null;

  const respond = async (approved: boolean) => {
    await submitInterruptResponses(
      interrupts.map((interrupt) => ({
        interruptId: interrupt.id,
        status: 'resolved',
        payload: { approved },
      })),
    );
  };

  return (
    <div className="flex max-w-[88%] gap-2.5 self-start">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 shadow-sm">
        <ShieldCheck className="size-3.5" />
      </span>
      <div className="flex min-w-0 flex-col gap-3 rounded-[1.15rem] rounded-bl-md border border-amber-200 bg-amber-50/92 px-4 py-3 text-sm text-foreground shadow-sm">
        <div>
          <p className="font-semibold">Cần duyệt trước khi chạy tool</p>
          <p className="mt-1 text-muted-foreground">
            {interrupts.map(interruptToolName).join(', ')}
          </p>
        </div>
        <pre className="max-h-52 overflow-auto rounded-lg border border-amber-200/70 bg-white/70 p-2 font-mono text-xs text-muted-foreground">
          {JSON.stringify(interrupts.map(interruptArguments), null, 2)}
        </pre>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void respond(true)}
            size="sm"
            className="rounded-full bg-foreground text-xs text-white hover:bg-foreground/88"
          >
            Duyệt
          </Button>
          <Button
            type="button"
            onClick={() => void respond(false)}
            variant="outline"
            size="sm"
            className="rounded-full bg-white/80 text-xs"
          >
            Từ chối
          </Button>
        </div>
      </div>
    </div>
  );
}
