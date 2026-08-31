'use client';

import { useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Brain, Wrench } from 'lucide-react';
import { useAuiState } from '@assistant-ui/react';

import { cn } from '@/lib/utils';

const ROW_HEIGHT = 110;
// Cùng lý do đã xác nhận là bug thật ở `OrchestratorCanvas.tsx` (ResizeObserver không cập nhật
// `node.measured` trong môi trường dev hiện tại) — khai `initialWidth`/`initialHeight` + `handles`
// tường minh để edge chắc chắn render, không phụ thuộc runtime measurement.
const NODE_WIDTH = 220;
const NODE_HEIGHT = 64;
const NODE_HANDLES = [
  { type: 'target' as const, position: Position.Top, x: NODE_WIDTH / 2, y: 0 },
  { type: 'source' as const, position: Position.Bottom, x: NODE_WIDTH / 2, y: NODE_HEIGHT },
];

type FlowPart =
  | { key: string; kind: 'think'; text: string; isFinal: boolean }
  | { key: string; kind: 'tool'; toolName: string; args: unknown; result: unknown; isError: boolean };

function toFlowParts(parts: readonly { type: string; [key: string]: unknown }[]): FlowPart[] {
  const flat: FlowPart[] = [];
  parts.forEach((p, i) => {
    if (p.type === 'text' && typeof p.text === 'string' && p.text.trim() !== '') {
      flat.push({ key: `part-${i}`, kind: 'think', text: p.text, isFinal: false });
    } else if (p.type === 'tool-call') {
      flat.push({
        key: `part-${i}`,
        kind: 'tool',
        toolName: String(p.toolName ?? 'tool'),
        args: p.args,
        result: p.result,
        isError: Boolean(p.isError),
      });
    }
  });
  // Node "think" cuối cùng (nếu có) là câu trả lời — không phải bước suy nghĩ giữa chừng.
  for (let i = flat.length - 1; i >= 0; i -= 1) {
    if (flat[i].kind === 'think') {
      (flat[i] as Extract<FlowPart, { kind: 'think' }>).isFinal = true;
      break;
    }
  }
  return flat;
}

function ThinkNode({ data, selected }: NodeProps<Node<{ text: string; isFinal: boolean }>>) {
  return (
    <div
      className={cn(
        'flex w-[220px] flex-col gap-1 rounded-lg border bg-background p-2.5 shadow-sm',
        data.isFinal ? 'border-accent' : 'border-border',
        selected && 'ring-2 ring-accent ring-offset-2 ring-offset-background',
      )}
    >
      <Handle type="target" position={Position.Top} className="bg-accent!" />
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <Brain className="size-3.5 shrink-0" />
        {data.isFinal ? 'Trả lời' : 'Suy nghĩ'}
      </div>
      <p className="line-clamp-2 text-xs text-foreground/70">{data.text}</p>
      <Handle type="source" position={Position.Bottom} className="bg-accent!" />
    </div>
  );
}

function ToolNode({
  data,
  selected,
}: NodeProps<Node<{ toolName: string; isError: boolean }>>) {
  return (
    <div
      className={cn(
        'flex w-[220px] items-center gap-1.5 rounded-lg border bg-background p-2.5 shadow-sm',
        data.isError ? 'border-destructive' : 'border-border',
        selected && 'ring-2 ring-accent ring-offset-2 ring-offset-background',
      )}
    >
      <Handle type="target" position={Position.Top} className="bg-accent!" />
      <Wrench className="size-3.5 shrink-0" />
      <span className="truncate font-mono text-xs">{data.toolName}</span>
      <Handle type="source" position={Position.Bottom} className="bg-accent!" />
    </div>
  );
}

const nodeTypes = { think: ThinkNode, tool: ToolNode };

function formatDetail(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** Graph ReactFlow — 1 cách xem KHÁC (chỉ xem, không sửa) cho cùng data đã dùng ở
 * `ToolCallStep.tsx` (docs/features/agent-execution-trace.md) — không đổi backend/dữ liệu, chỉ
 * đọc lại `message.parts` (thứ tự chronological đã xác nhận đúng qua `run-aggregator.ts`) và vẽ
 * thành chuỗi node tuần tự thay vì step chip trong bong bóng chat. */
export function TurnFlowGraph() {
  const parts = useAuiState((s) => s.message.parts);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const flowParts = useMemo(() => toFlowParts(parts), [parts]);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = flowParts.map((p, i) => ({
      id: p.key,
      type: p.kind,
      position: { x: 0, y: i * ROW_HEIGHT },
      data: p.kind === 'think' ? { text: p.text, isFinal: p.isFinal } : { toolName: p.toolName, isError: p.isError },
      selected: p.key === selectedKey,
      initialWidth: NODE_WIDTH,
      initialHeight: NODE_HEIGHT,
      handles: NODE_HANDLES,
    }));
    const edges: Edge[] = flowParts.slice(1).map((p, i) => ({
      id: `${flowParts[i].key}->${p.key}`,
      source: flowParts[i].key,
      target: p.key,
    }));
    return { nodes, edges };
  }, [flowParts, selectedKey]);

  const selected = flowParts.find((p) => p.key === selectedKey) ?? null;

  return (
    <div className="flex h-full flex-col gap-3 sm:flex-row">
      <div className="min-h-64 flex-1 rounded-lg border border-border">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedKey(node.id)}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      {selected && (
        <div className="flex w-full flex-col gap-2 overflow-y-auto rounded-lg border border-border p-3 text-xs sm:w-64 sm:shrink-0">
          {selected.kind === 'think' ? (
            <>
              <p className="font-semibold">{selected.isFinal ? 'Trả lời' : 'Suy nghĩ'}</p>
              <p className="whitespace-pre-wrap text-foreground/80">{selected.text}</p>
            </>
          ) : (
            <>
              <p className="font-mono font-semibold">{selected.toolName}</p>
              <div>
                <p className="mb-1 font-medium text-foreground/60">Tham số</p>
                <pre className="overflow-x-auto rounded-md bg-muted/40 p-2 font-mono">
                  {formatDetail(selected.args)}
                </pre>
              </div>
              {selected.result !== undefined && (
                <div>
                  <p
                    className={cn(
                      'mb-1 font-medium',
                      selected.isError ? 'text-destructive' : 'text-foreground/60',
                    )}
                  >
                    {selected.isError ? 'Lỗi' : 'Kết quả'}
                  </p>
                  <pre className="overflow-x-auto rounded-md bg-muted/40 p-2 font-mono whitespace-pre-wrap">
                    {formatDetail(selected.result)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
