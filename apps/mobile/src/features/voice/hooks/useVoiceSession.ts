import { useMemo, useRef, useState } from 'react';
import {
  TranscriptEntry,
  VoiceSessionClient,
  VoiceSessionEvent,
  VoiceState,
} from '../services/voiceSession.service';

type UseVoiceSessionArgs = {
  apiBaseUrl: string;
  conversationId: string;
};

export function useVoiceSession({ apiBaseUrl, conversationId }: UseVoiceSessionArgs) {
  const clientRef = useRef<VoiceSessionClient | null>(null);
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [audioBytesReceived, setAudioBytesReceived] = useState(0);

  const canStart = useMemo(
    () => apiBaseUrl.trim().length > 0 && conversationId.trim().length > 0 && state !== 'connecting',
    [apiBaseUrl, conversationId, state],
  );

  function handleEvent(event: VoiceSessionEvent) {
    if (event.type === 'opened') {
      setState('listening');
      setLastError(null);
      return;
    }
    if (event.type === 'closed') {
      setState('closed');
      return;
    }
    if (event.type === 'error') {
      setState('error');
      setLastError(event.message);
      return;
    }
    if (event.type === 'state') {
      setState(event.value);
      return;
    }
    if (event.type === 'transcript') {
      setTranscript((current) => [
        ...current,
        {
          id: `${Date.now()}-${current.length}`,
          role: event.role,
          text: event.text,
        },
      ]);
      return;
    }
    if (event.type === 'binary_audio') {
      setAudioBytesReceived((current) => current + event.byteLength);
      return;
    }
    if (event.type === 'interrupted') {
      setState('listening');
    }
  }

  function start() {
    if (!canStart) {
      setLastError('Cần API base URL và conversation ID trước khi bắt đầu.');
      return;
    }

    clientRef.current?.close();
    setState('connecting');
    setLastError(null);
    setTranscript([]);
    setAudioBytesReceived(0);

    const client = new VoiceSessionClient({
      apiBaseUrl,
      conversationId,
      onEvent: handleEvent,
    });
    clientRef.current = client;
    client.connect();
  }

  function stop() {
    clientRef.current?.close();
    clientRef.current = null;
    setState('closed');
  }

  function sendText(text: string) {
    clientRef.current?.sendText(text);
  }

  return {
    audioBytesReceived,
    canStart,
    lastError,
    sendText,
    start,
    state,
    stop,
    transcript,
  };
}
