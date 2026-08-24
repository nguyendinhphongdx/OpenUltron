/**
 * Khớp shape JSON server gửi qua WebSocket `apps/api/app/modules/voice/service.py`
 * (`forward_gemini_to_browser`) — đổi ở BE thì sửa ở đây.
 */

export type VoiceState = 'listening' | 'thinking' | 'speaking' | 'using_tool';

export type VoiceServerEvent =
  | { type: 'state'; value: VoiceState }
  | { type: 'transcript'; role: 'user' | 'model'; text: string }
  | { type: 'interrupted' }
  | { type: 'turn_complete' };

export type VoiceSessionStatus = 'idle' | 'connecting' | 'active' | 'error';

export interface VoiceTranscriptLine {
  role: 'user' | 'model';
  text: string;
}
