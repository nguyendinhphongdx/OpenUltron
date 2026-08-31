'use client';

import {
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { Workflow } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { useModels } from '@/features/model/hooks';
import { useAddDelegation } from '../hooks/useAddDelegation';
import { useAgents } from '../hooks/useAgents';
import { orchestratorTreeQueryKey, useOrchestratorTree } from '../hooks/useOrchestratorTree';
import { useReadiness } from '../hooks/useReadiness';
import { useRemoveDelegation } from '../hooks/useRemoveDelegation';
import { useUpdateDelegation } from '../hooks/useUpdateDelegation';
import type { Agent, AgentNodeReadiness, OrchestratorTreeNode } from '../types/agent.types';

const COL_WIDTH = 200;
const ROW_HEIGHT = 130;
// Kích thước thật của `AgentNodeCard` (khớp `w-44` = 176px + nội dung bên trong) — khai tường
// minh qua `initialWidth`/`initialHeight` thay vì để ReactFlow tự đo qua ResizeObserver lúc mount.
// Bug thật phát hiện qua feedback user (2026-08-25): trong môi trường dev hiện tại, ResizeObserver
// của chính node KHÔNG BAO GIỜ cập nhật `node.measured` dù ResizeObserver bản thân hoạt động bình
// thường (tự test riêng bằng 1 observer khác trên đúng element đó, vẫn fire đúng) — nghi lỗi nằm
// trong tầng cập nhật Zustand store nội bộ của `@xyflow/react` (12.11.3), không phải do container
// 0 kích thước hay React StrictMode (đã loại trừ cả 2 giả thuyết đó bằng test trực tiếp). Vì node
// không cần resize (card có nội dung cố định), khai sẵn kích thước là cách né an toàn,
// không phụ thuộc runtime measurement — ReactFlow coi `initialWidth`/`initialHeight` là đủ để
// `nodeHasDimensions()` trả `true` ngay từ frame đầu, không cần chờ `node.measured`.
const NODE_WIDTH = 176;
const NODE_HEIGHT = 76;

// Cùng lý do NODE_WIDTH/NODE_HEIGHT ở trên — `internals.handleBounds` (vị trí handle để vẽ edge)
// cũng phụ thuộc measurement bị lỗi, khiến edge không bao giờ render (dù node đã hiện đúng nhờ
// initialWidth/initialHeight). Khai `handles` tường minh trên node — API chính thức của
// @xyflow/react cho đúng use-case "vị trí handle biết trước cố định", bỏ qua hẳn
// `internals.handleBounds`/ResizeObserver. Khớp 2 <Handle> trong AgentNodeCard: target ở
// Position.Top (giữa cạnh trên), source ở Position.Bottom (giữa cạnh dưới).
const AGENT_NODE_HANDLES = [
  { type: 'target' as const, position: Position.Top, x: NODE_WIDTH / 2, y: 0 },
  { type: 'source' as const, position: Position.Bottom, x: NODE_WIDTH / 2, y: NODE_HEIGHT },
];

interface PosNode {
  key: string;
  x: number;
  y: number;
  agent: Agent;
  parentKey: string | null;
  parentAgentId: number | null;
  delegationId: number | null;
  taskDescription: string | null;
}

interface EdgeData {
  orchestratorAgentId: number;
  subAgentId: number;
  delegationId: number;
  taskDescription: string | null;
}

function layout(
  node: OrchestratorTreeNode,
  depth: number,
  parentKey: string | null,
  parentAgentId: number | null,
  counter: { n: number },
  out: PosNode[],
): number {
  const key = parentKey ? `${parentKey}::${node.agent.id}` : `${node.agent.id}`;
  if (node.children.length === 0) {
    const x = counter.n * COL_WIDTH;
    counter.n += 1;
    out.push({
      key,
      x,
      y: depth * ROW_HEIGHT,
      agent: node.agent,
      parentKey,
      parentAgentId,
      delegationId: node.delegationId,
      taskDescription: node.taskDescription,
    });
    return x;
  }
  const childXs = node.children.map((c) => layout(c, depth + 1, key, node.agent.id, counter, out));
  const x = (Math.min(...childXs) + Math.max(...childXs)) / 2;
  out.push({
    key,
    x,
    y: depth * ROW_HEIGHT,
    agent: node.agent,
    parentKey,
    parentAgentId,
    delegationId: node.delegationId,
    taskDescription: node.taskDescription,
  });
  return x;
}

function AgentNodeCard({
  data,
  selected,
}: NodeProps<Node<{ agent: Agent; modelLabel: string; readiness?: AgentNodeReadiness }>>) {
  const { agent, modelLabel, readiness } = data;
  const ready = readiness?.ready ?? true;
  return (
    <div
      className={cn(
        'w-44 rounded-lg border bg-background shadow-sm',
        agent.is_orchestrator ? 'border-accent' : 'border-border',
        selected && 'ring-2 ring-accent ring-offset-2 ring-offset-background',
      )}
    >
      <Handle type="target" position={Position.Top} className="bg-accent!" />
      <div
        className={cn(
          'flex items-center gap-2 rounded-t-lg border-b border-border px-2.5 py-2',
          agent.is_orchestrator && 'bg-accent/10',
        )}
      >
        <span
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', ready ? 'bg-emerald-500' : 'bg-orange-500')}
        />
        <span className="truncate text-xs font-semibold">{agent.slug}</span>
        {agent.is_orchestrator && (
          <span className="ml-auto shrink-0 font-mono text-[9px] uppercase text-accent">
            supervisor
          </span>
        )}
      </div>
      <div className="px-2.5 py-2">
        <span className="rounded border border-border bg-foreground/5 px-1.5 py-0.5 font-mono text-[10px] text-foreground/70">
          {modelLabel}
        </span>
        {!ready && readiness && readiness.issues.length > 0 && (
          <p
            className="mt-1 truncate text-[9px] text-orange-600"
            title={readiness.issues.join('; ')}
          >
            ⚠ {readiness.issues[0]}
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="bg-accent!" />
    </div>
  );
}

const nodeTypes = { agentNode: AgentNodeCard };

/** Panel bên phải khi chọn 1 edge (delegation) — `key={edge.id}` ở nơi gọi để reset local state
 * mỗi lần đổi edge chọn, tránh cần `useEffect` đồng bộ ngược từ props. */
function EdgeContractPanel({
  edge,
  sourceLabel,
  targetLabel,
  onSave,
  isSaving,
  isError,
}: {
  edge: Edge;
  sourceLabel: string;
  targetLabel: string;
  onSave: (taskDescription: string) => void;
  isSaving: boolean;
  isError: boolean;
}) {
  const data = edge.data as unknown as EdgeData;
  const [value, setValue] = useState(data.taskDescription ?? '');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-wide text-foreground/50">
          Cạnh đang chọn
        </p>
        <p className="text-sm font-semibold">
          {sourceLabel} → {targetLabel}
        </p>
      </div>
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-wide text-foreground/50">
          Task description
        </p>
        <textarea
          className="min-h-24 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Mô tả nhiệm vụ riêng cho cạnh delegation này…"
        />
      </div>
      <Button size="sm" onClick={() => onSave(value)} disabled={isSaving}>
        {isSaving ? 'Đang lưu…' : 'Lưu'}
      </Button>
      {isError && <p className="text-xs text-red-500">Không lưu được task description.</p>}
      <p className="text-xs text-foreground/50">
        Chọn cạnh rồi nhấn Delete/Backspace để gỡ delegation đó.
      </p>
    </div>
  );
}

interface OrchestratorCanvasProps {
  rootAgentId: number;
  /** Chiều cao container ngoài cùng — mặc định gần full viewport (dùng khi canvas là 1 trang riêng
   * `/orchestrators/[id]`). Truyền `h-full` khi nhúng trong 1 khối có chiều cao cố định sẵn (vd tab
   * Sub-agent của `AgentDetailView`) — không đổi mặc định để không phá trang orchestrator hiện có. */
  heightClassName?: string;
}

export function OrchestratorCanvas({
  rootAgentId,
  heightClassName = 'h-[calc(100vh-3.5rem)]',
}: OrchestratorCanvasProps) {
  const { data: tree, isPending, isError } = useOrchestratorTree(rootAgentId);
  const { data: allAgents } = useAgents();
  const { data: models } = useModels();
  const { data: readiness } = useReadiness(rootAgentId);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  // Vị trí node user tự kéo — auto-layout (`layout()`) chỉ dùng làm vị trí KHỞI TẠO; không lưu
  // đè lên đây thì mọi re-render (vd đổi `selectedAgentId` lúc click chọn node) sẽ tính lại
  // `nodes` từ đầu và snap ngược về vị trí auto-layout, y như kéo không có tác dụng gì (bug thật
  // — ReactFlow là "controlled" component khi tự truyền `nodes` prop, cần tự lưu + merge lại vị
  // trí qua `onNodesChange`, không tự nhớ giùm). Chỉ session hiện tại — chưa lưu xuống backend
  // (Agent chưa có field toạ độ), mất khi rời trang; đủ cho nhu cầu "kéo sắp xếp lại lúc đang xem".
  const [manualPositions, setManualPositions] = useState<Record<string, { x: number; y: number }>>(
    {},
  );
  const queryClient = useQueryClient();

  // `useAddDelegation` chỉ invalidate `subAgentsQueryKey` (đủ cho `DelegationManager`) — canvas
  // cần thêm invalidate `orchestratorTreeQueryKey` để re-layout graph, làm ở `onSuccess` per-call
  // bên dưới thay vì sửa hook dùng chung. `rootAgentId` truyền thêm để hook tự invalidate readiness.
  const addDelegation = useAddDelegation(selectedAgentId ?? -1, rootAgentId);
  const removeDelegation = useRemoveDelegation(rootAgentId);
  const updateDelegation = useUpdateDelegation(rootAgentId);

  const modelLabel = (modelId: number) =>
    models?.find((m) => m.id === modelId)?.slug ?? `model #${modelId}`;

  const readinessMap = useMemo(() => {
    const map = new Map<number, AgentNodeReadiness>();
    for (const n of readiness?.nodes ?? []) map.set(n.agent_id, n);
    return map;
  }, [readiness]);

  const { nodes, edges, positions } = useMemo(() => {
    if (!tree) return { nodes: [] as Node[], edges: [] as Edge[], positions: [] as PosNode[] };
    const out: PosNode[] = [];
    layout(tree, 0, null, null, { n: 0 }, out);

    const nodes: Node[] = out.map((p) => ({
      id: p.key,
      type: 'agentNode',
      position: manualPositions[p.key] ?? { x: p.x, y: p.y },
      data: {
        agent: p.agent,
        modelLabel: modelLabel(p.agent.model_id),
        readiness: readinessMap.get(p.agent.id),
      },
      selected: p.agent.id === selectedAgentId,
      initialWidth: NODE_WIDTH,
      initialHeight: NODE_HEIGHT,
      handles: AGENT_NODE_HANDLES,
    }));

    const edges: Edge[] = out
      .filter((p) => p.parentKey !== null && p.parentAgentId !== null && p.delegationId !== null)
      .map((p) => ({
        id: `delegation-${p.delegationId}`,
        source: p.parentKey as string,
        target: p.key,
        label: 'delegate',
        selected: `delegation-${p.delegationId}` === selectedEdgeId,
        data: {
          orchestratorAgentId: p.parentAgentId as number,
          subAgentId: p.agent.id,
          delegationId: p.delegationId as number,
          taskDescription: p.taskDescription,
        } satisfies EdgeData,
      }));

    return { nodes, edges, positions: out };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, models, selectedAgentId, selectedEdgeId, manualPositions, readinessMap]);

  const handleNodesChange = (changes: NodeChange[]) => {
    const updated = applyNodeChanges(changes, nodes);
    setManualPositions((prev) => {
      const next = { ...prev };
      for (const n of updated) next[n.id] = n.position;
      return next;
    });
  };

  if (isPending) return <LoadingState label="Đang tải graph…" />;
  if (isError || !tree) {
    return <EmptyState icon={Workflow} tone="destructive" title="Không tải được orchestrator này." />;
  }

  const selectedPos = positions.find((p) => p.agent.id === selectedAgentId);
  const selectedReadiness = selectedPos ? readinessMap.get(selectedPos.agent.id) : undefined;
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);
  const directChildAgentIds = new Set(
    positions.filter((p) => p.parentAgentId === selectedAgentId).map((p) => p.agent.id),
  );
  const candidateAgents = (allAgents ?? []).filter(
    (a) => a.id !== selectedAgentId && !directChildAgentIds.has(a.id),
  );

  return (
    <div className={cn('flex', heightClassName)}>
      <div className="min-h-0 min-w-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onNodeClick={(_, node) => {
            const pos = positions.find((p) => p.key === node.id);
            setSelectedAgentId(pos?.agent.id ?? null);
            setSelectedEdgeId(null);
          }}
          onEdgeClick={(_, edge) => {
            setSelectedEdgeId(edge.id);
            setSelectedAgentId(null);
          }}
          onEdgesDelete={(deleted: Edge[]) => {
            deleted.forEach((edge) => {
              const data = edge.data as unknown as EdgeData;
              removeDelegation.mutate({
                orchestratorId: data.orchestratorAgentId,
                subAgentId: data.subAgentId,
              });
              if (edge.id === selectedEdgeId) setSelectedEdgeId(null);
            });
          }}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>

      <aside className="w-72 shrink-0 overflow-y-auto border-l border-border p-4">
        {selectedEdge ? (
          <EdgeContractPanel
            key={selectedEdge.id}
            edge={selectedEdge}
            sourceLabel={
              positions.find((p) => p.key === selectedEdge.source)?.agent.slug ?? selectedEdge.source
            }
            targetLabel={
              positions.find((p) => p.key === selectedEdge.target)?.agent.slug ?? selectedEdge.target
            }
            isSaving={updateDelegation.isPending}
            isError={updateDelegation.isError}
            onSave={(taskDescription) => {
              const data = selectedEdge.data as unknown as EdgeData;
              updateDelegation.mutate({
                orchestratorId: data.orchestratorAgentId,
                subAgentId: data.subAgentId,
                taskDescription: taskDescription.trim() === '' ? null : taskDescription,
              });
            }}
          />
        ) : !selectedPos ? (
          <p className="text-sm text-foreground/60">Chọn 1 node hoặc 1 cạnh để xem chi tiết.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-semibold">{selectedPos.agent.slug}</h3>
              <p className="font-mono text-xs text-foreground/60">{selectedPos.agent.name}</p>
            </div>
            <div className="text-xs">
              <p className="mb-1 font-mono uppercase tracking-wide text-foreground/50">Model</p>
              <p>{modelLabel(selectedPos.agent.model_id)}</p>
            </div>

            {selectedReadiness && !selectedReadiness.ready && (
              <div>
                <p className="mb-1 flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-orange-600">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                  Chưa sẵn sàng
                </p>
                <ul className="list-inside list-disc text-xs text-foreground/70">
                  {selectedReadiness.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedPos.agent.is_orchestrator && (
              <div>
                <p className="mb-2 font-mono text-xs uppercase tracking-wide text-foreground/50">
                  Thêm sub-agent
                </p>
                <select
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  defaultValue=""
                  onChange={(e) => {
                    const subAgentId = Number(e.target.value);
                    if (subAgentId && selectedAgentId) {
                      addDelegation.mutate(subAgentId, {
                        onSuccess: () => {
                          queryClient.invalidateQueries({
                            queryKey: orchestratorTreeQueryKey(rootAgentId),
                          });
                        },
                      });
                    }
                    e.target.value = '';
                  }}
                >
                  <option value="" disabled>
                    Chọn agent…
                  </option>
                  {candidateAgents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.slug}
                    </option>
                  ))}
                </select>
                {addDelegation.isError && (
                  <p className="mt-1 text-xs text-red-500">
                    Không gán được — có thể tạo vòng lặp hoặc đã tồn tại.
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-foreground/50">
              Chọn 1 cạnh (edge) trên canvas rồi nhấn Delete/Backspace để gỡ delegation đó.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
