'use client';

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { ENV } from '@/constants/env';
import { endpoints } from '@/lib/api';

export type ChatStreamStatus = 'idle' | 'streaming' | 'error';

interface ChatStreamState {
  status: ChatStreamStatus;
  /** Message user vừa gửi, hiện optimistic ngay — list message thật chỉ có sau khi `done`
   * (invalidate query), giống lý do đã sửa ở `useSendMessage` cũ (không đợi cả round-trip). */
  pendingUserText: string | null;
  assistantText: string;
  toolCallName: string | null;
  error: string | null;
}

const INITIAL_STATE: ChatStreamState = {
  status: 'idle',
  pendingUserText: null,
  assistantText: '',
  toolCallName: null,
  error: null,
};

type ServerEvent =
  | { type: 'delta'; text: string }
  | { type: 'tool_call_start'; name: string }
  | { type: 'tool_call_end'; name: string }
  | { type: 'error'; message: string }
  | { type: 'done'; message_id: number; seq: number };

/** Gửi message qua `POST /conversations/{id}/chat` — response là SSE, không phải JSON 1 lần
 * (chat-streaming, docs/features/chat-streaming.md). Không dùng `EventSource` (chỉ hỗ trợ GET
 * — message content không hợp đưa vào query string) — đọc `response.body` bằng tay, tự parse
 * frame `data: <json>\n\n`. */
export function useChatStream(conversationId: number) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ChatStreamState>(INITIAL_STATE);
  const bufferRef = useRef('');

  const send = useCallback(
    async (content: string) => {
      setState({ ...INITIAL_STATE, status: 'streaming', pendingUserText: content });
      bufferRef.current = '';

      let response: Response;
      try {
        response = await fetch(`${ENV.apiBaseUrl}${endpoints.conversations.chat(conversationId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
      } catch {
        setState((prev) => ({ ...prev, status: 'error', error: 'Không gửi được — kiểm tra kết nối.' }));
        return;
      }

      if (!response.ok || !response.body) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: `Không gửi được (HTTP ${response.status}).`,
        }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bufferRef.current += decoder.decode(value, { stream: true });

        let frameEnd = bufferRef.current.indexOf('\n\n');
        while (frameEnd !== -1) {
          const frame = bufferRef.current.slice(0, frameEnd);
          bufferRef.current = bufferRef.current.slice(frameEnd + 2);
          frameEnd = bufferRef.current.indexOf('\n\n');

          const line = frame.startsWith('data: ') ? frame.slice(6) : frame;
          if (!line) continue;
          const event = JSON.parse(line) as ServerEvent;

          if (event.type === 'delta') {
            setState((prev) => ({ ...prev, assistantText: prev.assistantText + event.text }));
          } else if (event.type === 'tool_call_start') {
            setState((prev) => ({ ...prev, toolCallName: event.name }));
          } else if (event.type === 'tool_call_end') {
            setState((prev) => ({ ...prev, toolCallName: null }));
          } else if (event.type === 'error') {
            setState((prev) => ({ ...prev, status: 'error', error: event.message }));
          } else if (event.type === 'done') {
            await queryClient.invalidateQueries({
              queryKey: ['conversations', conversationId, 'messages'],
            });
            setState(INITIAL_STATE);
          }
        }
      }
    },
    [conversationId, queryClient],
  );

  return { ...state, send };
}
