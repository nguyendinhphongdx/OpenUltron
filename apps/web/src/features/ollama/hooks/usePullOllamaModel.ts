'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { ollamaService } from '../services/ollama.service';
import type { OllamaPullEvent } from '../types/ollama.types';
import { OLLAMA_INSTALLED_QUERY_KEY } from './useOllamaInstalled';

/** Quản lý lifecycle 1 `EventSource` (SSE, ADR-0011) — hook riêng vì đây không phải
 * request/response 1 lần như `useQuery`/`useMutation` thông thường (tanstack-query không có
 * primitive cho streaming), tự quản lý state pull hiện tại. */
export function usePullOllamaModel() {
  const queryClient = useQueryClient();
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [event, setEvent] = useState<OllamaPullEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  // Đóng EventSource khi component unmount (vd user đóng dialog giữa lúc pull) — nếu không,
  // connection SSE tới backend (và httpx stream tới Ollama phía service.py) chạy vô ích, đúng
  // rủi ro đã nêu trong ADR-0011 phần Consequences.
  useEffect(() => () => sourceRef.current?.close(), []);

  const pull = useCallback(
    (model: string) => {
      sourceRef.current?.close();
      setPullingModel(model);
      setEvent(null);
      setError(null);

      const source = new EventSource(ollamaService.pullUrl(model));
      sourceRef.current = source;

      source.onmessage = (e) => {
        const parsed = JSON.parse(e.data) as OllamaPullEvent;
        setEvent(parsed);
        if (parsed.status === 'error') {
          setError(parsed.error ?? 'Pull thất bại');
          source.close();
          setPullingModel(null);
        } else if (parsed.status === 'success') {
          source.close();
          setPullingModel(null);
          queryClient.invalidateQueries({ queryKey: OLLAMA_INSTALLED_QUERY_KEY });
        }
      };

      source.onerror = () => {
        setError('Mất kết nối SSE tới server.');
        source.close();
        setPullingModel(null);
      };
    },
    [queryClient],
  );

  return { pull, pullingModel, event, error };
}
