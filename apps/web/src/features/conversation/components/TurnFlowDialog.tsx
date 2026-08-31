'use client';

import { Waypoints } from 'lucide-react';
import { useAuiState } from '@assistant-ui/react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { TurnFlowGraph } from './TurnFlowGraph';

/** Nút mở graph trace (docs/features/agent-execution-trace.md) — chỉ hiện khi turn có ít nhất 1
 * tool-call part; turn chỉ có text trơn thì không có gì đáng vẽ thành graph. */
export function TurnFlowDialog() {
  const hasToolCall = useAuiState((s) => s.message.parts.some((p) => p.type === 'tool-call'));
  if (!hasToolCall) return null;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-7 gap-1.5 px-2 text-xs text-muted-foreground"
          />
        }
      >
        <Waypoints className="size-3.5" />
        Xem dạng graph
      </DialogTrigger>
      <DialogContent className="h-[75vh] w-full max-w-[calc(100%-2rem)] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Luồng thực thi turn này</DialogTitle>
        </DialogHeader>
        <TurnFlowGraph />
      </DialogContent>
    </Dialog>
  );
}
