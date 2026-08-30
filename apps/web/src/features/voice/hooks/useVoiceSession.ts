'use client';

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { ENV } from '@/constants/env';
import { conversationMessagesQueryKey } from '@/features/conversation';

import type { VoiceServerEvent, VoiceSessionStatus, VoiceState, VoiceTranscriptLine } from '../types/voice.types';

const CAPTURE_SAMPLE_RATE = 16_000; // yêu cầu input của Gemini Live (PCM 16-bit, 16kHz, LE).
const PLAYBACK_SAMPLE_RATE = 24_000; // format output thật của Gemini Live (xem docs/research/).

function toWsUrl(conversationId: number): string {
  const wsBase = ENV.apiBaseUrl.replace(/^http/, 'ws');
  return `${wsBase}/conversations/${conversationId}/voice`;
}

/** PCM16 little-endian → Float32 [-1, 1] — format chuẩn Web Audio API dùng cho AudioBuffer. */
function pcm16ToFloat32(buffer: ArrayBuffer): Float32Array {
  const view = new DataView(buffer);
  const out = new Float32Array(buffer.byteLength / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = view.getInt16(i * 2, true) / 0x8000;
  }
  return out;
}

// Tần số riêng mỗi trạng thái (Hz) — user nghe phân biệt được đang chuyển sang trạng thái nào,
// không chỉ biết "có gì đó vừa đổi". Chọn quãng gần nhau (E4-A5), tránh chói tai.
const STATE_TONE_HZ: Record<VoiceState, number> = {
  listening: 660,
  thinking: 440,
  speaking: 880,
  using_tool: 330,
};

/** Beep ngắn (~120ms), âm lượng thấp, fade in/out tránh tiếng "tách" — báo hiệu voice state vừa
 * đổi. Dùng lại `ctx` (AudioContext playback đã có sẵn cho audio model) thay vì tạo context riêng
 * — tránh giới hạn số AudioContext đồng thời của trình duyệt. */
function playStateTone(ctx: AudioContext, frequencyHz: number): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequencyHz;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.05, now + 0.01);
  gain.gain.linearRampToValueAtTime(0, now + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.13);
}

/** Quản lý 1 voice session (ADR-0009): mic capture (AudioWorklet, 16kHz PCM) → WebSocket →
 * relay `apps/api` → phát lại audio model trả về (24kHz PCM) + transcript/state realtime.
 * KHÔNG dùng cho SSR — chỉ gọi trong component `'use client'`. */
export function useVoiceSession(conversationId: number) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<VoiceSessionStatus>('idle');
  const [voiceState, setVoiceState] = useState<VoiceState>('listening');
  const [transcript, setTranscript] = useState<VoiceTranscriptLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const captureContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  // Mirror `voiceState` — `ws.onmessage` đóng closure lúc `start()` nên đọc `voiceState` trực
  // tiếp sẽ bị stale; cần ref để so sánh "state có thực sự đổi không" trước khi phát tone.
  const voiceStateRef = useRef<VoiceState>('listening');

  const stopPlayback = useCallback(() => {
    for (const source of activeSourcesRef.current) {
      try {
        source.stop();
      } catch {
        // Đã stop/kết thúc tự nhiên rồi — bỏ qua.
      }
    }
    activeSourcesRef.current = [];
    if (playbackContextRef.current) {
      nextPlayTimeRef.current = playbackContextRef.current.currentTime;
    }
  }, []);

  const playChunk = useCallback((pcm: ArrayBuffer) => {
    const ctx = playbackContextRef.current;
    if (!ctx) return;
    const float32 = pcm16ToFloat32(pcm);
    const audioBuffer = ctx.createBuffer(1, float32.length, PLAYBACK_SAMPLE_RATE);
    // `Float32Array` mới tạo luôn backed bởi `ArrayBuffer` thật (không phải SharedArrayBuffer) —
    // cast để khớp lib.dom.d.ts (TS suy generic ArrayBufferLike quá rộng so với chữ ký thật).
    audioBuffer.copyToChannel(float32 as Float32Array<ArrayBuffer>, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
    };

    const startAt = Math.max(nextPlayTimeRef.current, ctx.currentTime);
    source.start(startAt);
    nextPlayTimeRef.current = startAt + audioBuffer.duration;
    activeSourcesRef.current.push(source);
  }, []);

  const appendTranscript = useCallback((role: 'user' | 'model', text: string) => {
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role) {
        return [...prev.slice(0, -1), { role, text: last.text + text }];
      }
      return [...prev, { role, text }];
    });
  }, []);

  const stop = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    captureContextRef.current?.close();
    captureContextRef.current = null;
    stopPlayback();
    playbackContextRef.current?.close();
    playbackContextRef.current = null;
    setStatus('idle');
    setVoiceState('listening');
    voiceStateRef.current = 'listening';
  }, [stopPlayback]);

  const start = useCallback(async () => {
    if (status === 'connecting' || status === 'active') return;
    setError(null);
    setStatus('connecting');
    setTranscript([]);

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      micStreamRef.current = micStream;

      const captureContext = new AudioContext({ sampleRate: CAPTURE_SAMPLE_RATE });
      captureContextRef.current = captureContext;
      await captureContext.audioWorklet.addModule('/audio/mic-worklet.js');

      const playbackContext = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
      playbackContextRef.current = playbackContext;
      nextPlayTimeRef.current = 0;

      const ws = new WebSocket(toWsUrl(conversationId));
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('active');
        const source = captureContext.createMediaStreamSource(micStream);
        const worklet = new AudioWorkletNode(captureContext, 'mic-capture-processor');
        worklet.port.onmessage = (event: MessageEvent) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(event.data as ArrayBuffer);
        };
        // Nối qua GainNode im lặng rồi mới ra destination — AudioWorkletNode chỉ được engine
        // "kéo" (process() chạy đều) khi nằm trong graph có đường tới destination; gain=0 để
        // không phát lại mic (tránh echo) nhưng vẫn giữ node "sống".
        const silentGain = captureContext.createGain();
        silentGain.gain.value = 0;
        source.connect(worklet);
        worklet.connect(silentGain);
        silentGain.connect(captureContext.destination);
      };

      ws.onmessage = (event: MessageEvent) => {
        if (event.data instanceof ArrayBuffer) {
          playChunk(event.data);
          return;
        }
        const payload = JSON.parse(event.data as string) as VoiceServerEvent;
        if (payload.type === 'state') {
          if (payload.value !== voiceStateRef.current && playbackContextRef.current) {
            playStateTone(playbackContextRef.current, STATE_TONE_HZ[payload.value]);
          }
          voiceStateRef.current = payload.value;
          setVoiceState(payload.value);
        } else if (payload.type === 'transcript') {
          appendTranscript(payload.role, payload.text);
        } else if (payload.type === 'interrupted') {
          stopPlayback();
        } else if (payload.type === 'turn_complete') {
          // Transcript thật đã persist vào Message ở BE (flush lúc turn_complete) — invalidate
          // để MessageThread hiện đúng, rồi clear panel live (tránh hiện trùng 2 nơi).
          queryClient.invalidateQueries({ queryKey: conversationMessagesQueryKey(conversationId) });
          setTranscript([]);
        }
      };

      ws.onerror = () => {
        setError('Mất kết nối voice session.');
        setStatus('error');
      };

      ws.onclose = () => {
        if (wsRef.current === ws) stop();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không mở được mic hoặc voice session.');
      setStatus('error');
      stop();
    }
  }, [appendTranscript, conversationId, playChunk, queryClient, status, stop, stopPlayback]);

  return { status, voiceState, transcript, error, start, stop };
}
