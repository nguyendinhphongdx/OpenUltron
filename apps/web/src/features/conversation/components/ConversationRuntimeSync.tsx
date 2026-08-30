'use client';

import { useEffect, useRef } from 'react';
import { useAuiState } from '@assistant-ui/react';
import { useQueryClient } from '@tanstack/react-query';

import { CONVERSATIONS_QUERY_KEY } from '../hooks/useConversations';
import { conversationMessagesQueryKey } from '../hooks/useMessages';

interface ConversationRuntimeSyncProps {
  conversationId: number;
}

export function ConversationRuntimeSync({ conversationId }: ConversationRuntimeSyncProps) {
  const queryClient = useQueryClient();
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const hasSeenRunning = useRef(false);

  useEffect(() => {
    if (isRunning) {
      hasSeenRunning.current = true;
      return;
    }

    if (!hasSeenRunning.current) return;
    hasSeenRunning.current = false;

    void queryClient.invalidateQueries({
      queryKey: conversationMessagesQueryKey(conversationId),
    });
    void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
  }, [conversationId, isRunning, queryClient]);

  return null;
}
