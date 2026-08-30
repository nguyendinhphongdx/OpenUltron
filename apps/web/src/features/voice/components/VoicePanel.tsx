'use client';

import { Mic, MicOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { useVoiceSession } from '../hooks/useVoiceSession';
import type { VoiceState } from '../types/voice.types';

const STATE_LABEL: Record<VoiceState, string> = {
  listening: 'Đang nghe…',
  thinking: 'Đang xử lý…',
  speaking: 'Đang nói…',
  using_tool: 'Đang chạy tool…',
};

const STATE_DOT_CLASS: Record<VoiceState, string> = {
  listening: 'bg-accent',
  thinking: 'bg-amber-500',
  speaking: 'bg-emerald-500',
  using_tool: 'bg-amber-500',
};

/** Toggle voice session (ADR-0009) — mic capture (AudioWorklet) ↔ WebSocket `apps/api`. Chỉ
 * hiện live transcript trong lúc session mở; transcript thật đã persist vào `Message` (BE flush
 * lúc turn_complete) nên `MessageThread` tự có sau khi session đóng/turn xong. */
export function VoicePanel({ conversationId }: { conversationId: number }) {
  const { status, voiceState, transcript, error, start, stop } = useVoiceSession(conversationId);
  const isActive = status === 'active' || status === 'connecting';

  return (
    <div className="border-t border-border/70 bg-white/55 backdrop-blur-xl">
      {isActive && (
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 pt-4 sm:px-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn('size-1.5 rounded-full motion-safe:animate-pulse', STATE_DOT_CLASS[voiceState])} />
            {STATE_LABEL[voiceState]}
          </div>
          {transcript.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-white/78 px-3 py-2 text-sm shadow-sm">
              {transcript.map((line, i) => (
                <p key={i} className={line.role === 'user' ? 'text-foreground' : 'text-muted-foreground'}>
                  {line.text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
      {error && <p className="mx-auto max-w-3xl px-4 pt-3 text-sm text-destructive sm:px-6">{error}</p>}
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 sm:px-6">
        <Button
          type="button"
          onClick={isActive ? stop : start}
          disabled={status === 'connecting'}
          aria-label={isActive ? 'Kết thúc voice session' : 'Bắt đầu voice session'}
          variant={isActive ? 'destructive' : 'outline'}
          size="lg"
          className={cn(
            'rounded-full text-xs',
            !isActive && 'bg-white/72 text-muted-foreground hover:bg-white hover:text-foreground',
          )}
        >
          {isActive ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
          {status === 'connecting' ? 'Đang kết nối…' : isActive ? 'Kết thúc voice' : 'Bắt đầu voice'}
        </Button>
      </div>
    </div>
  );
}
