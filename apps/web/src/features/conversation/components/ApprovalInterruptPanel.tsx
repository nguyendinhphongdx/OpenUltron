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

/** ADR-0022 — `ssh-execute` là tool rủi ro cao nhất từ trước tới nay (không có sandbox path bảo
 * vệ, host tuỳ ý model chọn) — hiện rõ host/username/command thay vì bắt user tự đọc JSON dump
 * chung để tránh duyệt nhầm. Chỉ thêm đúng 1 nhánh renderer riêng cho tool này (không tổng quát
 * hoá thành registry slug → component — chưa có tool thứ 2 cần, AGENTS.md rule 2); tool khác vẫn
 * fallback JSON dump như cũ. */
function SshExecuteDetail({ args }: { args: unknown }) {
  const a = (args ?? {}) as { host?: unknown; port?: unknown; username?: unknown; command?: unknown };
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-amber-200/70 bg-white/70 p-2.5 font-mono text-xs">
      <p>
        <span className="text-muted-foreground">Host: </span>
        <span className="font-semibold text-foreground">
          {String(a.username ?? '?')}@{String(a.host ?? '?')}:{String(a.port ?? 22)}
        </span>
      </p>
      <p className="whitespace-pre-wrap break-all">
        <span className="text-muted-foreground">Lệnh: </span>
        <span className="font-semibold text-foreground">{String(a.command ?? '')}</span>
      </p>
    </div>
  );
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
        <div className="flex max-h-52 flex-col gap-2 overflow-auto">
          {interrupts.map((interrupt) =>
            interruptToolName(interrupt) === 'ssh-execute' ? (
              <SshExecuteDetail key={interrupt.id} args={interruptArguments(interrupt)} />
            ) : (
              <pre
                key={interrupt.id}
                className="overflow-auto rounded-lg border border-amber-200/70 bg-white/70 p-2 font-mono text-xs text-muted-foreground"
              >
                {JSON.stringify(interruptArguments(interrupt), null, 2)}
              </pre>
            ),
          )}
        </div>
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
