import { buildApiUrl, buildWsUrl } from '../../../shared/services';

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'using_tool' | 'closed' | 'error';

export type TranscriptRole = 'user' | 'model';

export type TranscriptEntry = {
  id: string;
  role: TranscriptRole;
  text: string;
};

export type VoiceSessionEvent =
  | { type: 'state'; value: Exclude<VoiceState, 'idle' | 'connecting' | 'closed' | 'error'> }
  | { type: 'transcript'; role: TranscriptRole; text: string }
  | { type: 'interrupted' }
  | { type: 'turn_complete' }
  | { type: 'binary_audio'; byteLength: number }
  | { type: 'opened' }
  | { type: 'closed' }
  | { type: 'error'; message: string };

type VoiceSessionClientOptions = {
  apiBaseUrl: string;
  conversationId: string;
  onEvent: (event: VoiceSessionEvent) => void;
};

export class VoiceSessionClient {
  private socket: WebSocket | null = null;
  private readonly onEvent: (event: VoiceSessionEvent) => void;
  private readonly url: string;
  private opened = false;

  constructor({ apiBaseUrl, conversationId, onEvent }: VoiceSessionClientOptions) {
    this.url = buildWsUrl(apiBaseUrl, `/conversations/${conversationId}/voice`);
    this.onEvent = onEvent;
  }

  connect() {
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.onopen = () => {
      this.opened = true;
      this.onEvent({ type: 'opened' });
    };
    socket.onclose = (event) => {
      if (!this.opened) {
        this.onEvent({
          type: 'error',
          message: `Không mở được voice WebSocket tới ${this.url}. Kiểm tra backend, API base URL và conversation ID.`,
        });
        return;
      }

      if (event.code === 1008) {
        this.onEvent({
          type: 'error',
          message: 'Backend từ chối voice session. Conversation ID có thể không tồn tại hoặc chưa có agent.',
        });
        return;
      }

      if (event.code === 1011) {
        this.onEvent({
          type: 'error',
          message: 'Backend mở voice provider thất bại. Kiểm tra credential Gemini/voice provider ở API.',
        });
        return;
      }

      this.onEvent({ type: 'closed' });
    };
    socket.onerror = () =>
      this.onEvent({
        type: 'error',
        message: `Voice WebSocket lỗi kết nối tới ${this.url}. Android emulator phải dùng http://10.0.2.2:8000.`,
      });
    socket.onmessage = (message) => {
      if (typeof message.data !== 'string') {
        const byteLength = typeof message.data?.size === 'number' ? message.data.size : 0;
        this.onEvent({ type: 'binary_audio', byteLength });
        return;
      }

      try {
        this.onEvent(JSON.parse(message.data) as VoiceSessionEvent);
      } catch {
        this.onEvent({ type: 'error', message: 'Backend trả voice event không hợp lệ.' });
      }
    };
  }

  sendText(text: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.onEvent({ type: 'error', message: 'Voice session chưa sẵn sàng.' });
      return;
    }
    this.socket.send(text);
  }

  close() {
    this.socket?.close();
    this.socket = null;
  }
}

export async function checkApiConnection(apiBaseUrl: string) {
  const response = await fetch(buildApiUrl(apiBaseUrl, '/health'));
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
}
