'use client';

import { useEffect, useState } from 'react';
import { AssistantRuntimeProvider, useAuiState } from '@assistant-ui/react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { MessageComposer, MessageThread, useAgentChatRuntime } from '@/features/conversation';

import { useCreateSimulatorConversation } from '../hooks/useCreateSimulatorConversation';
import { orchestratorTreeQueryKey } from '../hooks/useOrchestratorTree';

interface RunSimulatorPanelProps {
  rootAgentId: number;
  /** Báo canvas biết 1 turn thử VỪA BẮT ĐẦU chạy — canvas dùng mốc này để biết cạnh nào (theo
   * `last_run_at`, Phase C) thuộc về lần chạy này, không phải lần chạy trước đó. */
  onRunStarted: () => void;
}

/** Cùng tinh thần `ConversationRuntimeSync.tsx` — theo dõi `isRunning` để biết lúc nào 1 turn bắt
 * đầu/kết thúc, thay vì tự đoán qua timeout. Bắt đầu (`false → true`) → báo canvas mốc thời gian
 * mới; kết thúc (`true → false`) → refetch tree để lấy `last_run_at` mới nhất từng cạnh. */
function SimulatorRunWatcher({
  rootAgentId,
  onRunStarted,
}: {
  rootAgentId: number;
  onRunStarted: () => void;
}) {
  const queryClient = useQueryClient();
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const [wasRunning, setWasRunning] = useState(false);

  useEffect(() => {
    if (isRunning && !wasRunning) onRunStarted();
    if (!isRunning && wasRunning) {
      void queryClient.invalidateQueries({ queryKey: orchestratorTreeQueryKey(rootAgentId) });
    }
    setWasRunning(isRunning);
  }, [isRunning, wasRunning, rootAgentId, onRunStarted, queryClient]);

  return null;
}

function SimulatorRuntime({
  rootAgentId,
  conversationId,
  onRunStarted,
}: {
  rootAgentId: number;
  conversationId: number;
  onRunStarted: () => void;
}) {
  const { runtime, runtimeError } = useAgentChatRuntime(conversationId, []);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SimulatorRunWatcher rootAgentId={rootAgentId} onRunStarted={onRunStarted} />
      <div className="flex h-96 flex-col overflow-hidden rounded-lg border border-border">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <MessageThread />
        </div>
        <MessageComposer error={runtimeError} />
      </div>
    </AssistantRuntimeProvider>
  );
}

/** Panel "Chạy thử" (Orchestrator v2 Phase D) — tái dùng nguyên `MessageThread`/`MessageComposer`
 * (kèm citation/tool-step trace đã có sẵn) qua 1 `Conversation` thật gắn với `rootAgentId`, thay
 * vì tự viết 1 cách khác để gửi/nhận 1 turn (khác hẳn 1 luồng sandbox riêng không lưu gì). */
export function RunSimulatorPanel({ rootAgentId, onRunStarted }: RunSimulatorPanelProps) {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const createConversation = useCreateSimulatorConversation(rootAgentId);

  if (conversationId === null) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold">Chạy thử</p>
        <p className="text-xs text-foreground/60">
          Gửi 1 tin nhắn thử tới agent gốc của graph này — tạo 1 hội thoại thật, cạnh nào được gọi
          tới sẽ tô màu ngay trên canvas sau khi xong.
        </p>
        <Button
          size="sm"
          onClick={() => createConversation.mutate(undefined, { onSuccess: (c) => setConversationId(c.id) })}
          disabled={createConversation.isPending}
        >
          {createConversation.isPending ? 'Đang tạo…' : 'Bắt đầu chạy thử'}
        </Button>
        {createConversation.isError && (
          <p className="text-xs text-red-500">Không tạo được hội thoại thử.</p>
        )}
      </div>
    );
  }

  return (
    <SimulatorRuntime
      rootAgentId={rootAgentId}
      conversationId={conversationId}
      onRunStarted={onRunStarted}
    />
  );
}
