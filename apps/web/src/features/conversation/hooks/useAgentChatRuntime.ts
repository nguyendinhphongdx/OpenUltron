'use client';

import { useMemo, useState } from 'react';
import { HttpAgent } from '@ag-ui/client';
import {
  fromThreadMessageLike,
  type ThreadHistoryAdapter,
  type ThreadMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react';
import { useAgUiRuntime } from '@assistant-ui/react-ag-ui';

import { ENV } from '@/constants/env';
import { endpoints } from '@/lib/api';

import type { CitationSource, Message } from '../types/conversation.types';

function citationSourcesFromMetadata(metadata: Message['metadata']): CitationSource[] {
  const sources = metadata?.sources;
  return Array.isArray(sources) ? (sources as CitationSource[]) : [];
}

function toThreadMessageLike(message: Message): ThreadMessageLike | null {
  if (message.role !== 'user' && message.role !== 'assistant' && message.role !== 'system') {
    return null;
  }

  const sources = citationSourcesFromMetadata(message.metadata);
  // Khôi phục lại đúng `data` part `"kb-sources"` mà lúc stream live AG-UI `CUSTOM` event tạo ra
  // (docs/features/kb-citation.md, `useCitationSources.ts`) — để lịch sử reload sau F5 vẫn hiện
  // citation giống hệt lúc vừa stream xong, cùng 1 chỗ đọc (`useCitationSources`), không phải 2
  // đường dữ liệu khác nhau.
  const content = sources.length > 0
    ? [
        { type: 'text' as const, text: message.content ?? '' },
        { type: 'data' as const, name: 'kb-sources', data: sources },
      ]
    : (message.content ?? '');

  return {
    id: String(message.id),
    role: message.role,
    content,
    createdAt: new Date(message.created_at),
    ...(message.role === 'assistant' ? { status: { type: 'complete', reason: 'stop' } as const } : {}),
  };
}

/**
 * Dựng 1 `AssistantRuntime` chat qua AG-UI cho 1 `conversationId` — tách từ `ConversationRuntime.tsx`
 * để dùng chung được với `RunSimulatorPanel.tsx` (Orchestrator v2 Phase D, docs/features/orchestrator-v2.md)
 * thay vì tự viết lại 1 cách khác để "chạy thử 1 turn" (parse SSE tay...) — cả hội thoại thật lẫn
 * simulator đều là "1 cuộc chat qua AG-UI", chỉ khác `persistedMessages` (rỗng cho simulator, luôn
 * là conversation mới) và phần UI bọc quanh (`ConversationShell`/`VoicePanel` chỉ dùng cho trang
 * chat thật).
 */
export function useAgentChatRuntime(conversationId: number, persistedMessages: Message[]) {
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const agent = useMemo(
    () =>
      new HttpAgent({
        url: `${ENV.apiBaseUrl}${endpoints.conversations.chatAgui(conversationId)}`,
        threadId: String(conversationId),
        agentId: `conversation-${conversationId}`,
      }),
    [conversationId],
  );
  const history = useMemo<ThreadHistoryAdapter>(() => {
    const messages = persistedMessages
      .map((message) => {
        const threadMessage = toThreadMessageLike(message);
        if (!threadMessage) return null;
        return fromThreadMessageLike(threadMessage, String(message.id), {
          type: 'complete',
          reason: 'unknown',
        });
      })
      .filter((message): message is ThreadMessage => message !== null);

    return {
      load: async () => ({
        headId: messages.at(-1)?.id ?? null,
        messages: messages.map((message, index) => ({
          parentId: index === 0 ? null : messages[index - 1]?.id ?? null,
          message,
        })),
      }),
      append: async () => undefined,
    };
  }, [persistedMessages]);
  const runtime = useAgUiRuntime({
    agent,
    adapters: { history },
    // Tắt (bug nghi vấn): API còn `unstable_` — cơ chế dispatch-transform tính lại `parentId` lúc
    // tin nhắn rời hàng đợi (`@assistant-ui/core`'s `external-store-thread-runtime-core.ts`) có
    // thể gắn sai parent, làm lịch sử cũ (đã load) mất kết nối khỏi branch đang hiển thị — đúng
    // triệu chứng thật gặp phải: gửi tin mới trong 1 conversation có sẵn lịch sử → chỉ turn mới
    // hiện, lịch sử cũ biến mất tới lúc F5 (server data vẫn nguyên, chỉ là render sai branch).
    // Ultron 1 người dùng không cần queue nhiều tin nhắn cùng lúc khi đang chạy — tắt để loại trừ.
    unstable_enableMessageQueue: false,
    onError: (error) => setRuntimeError(error.message),
  });

  return { runtime, runtimeError };
}
