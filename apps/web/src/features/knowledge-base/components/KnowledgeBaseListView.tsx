'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BookOpen, LayoutGrid, List, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { PageShell } from '@/components/layout/PageShell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useModels } from '@/features/model';
import { getApiErrorMessage } from '@/lib/api';

import { useDeleteKnowledgeBase } from '../hooks/useDeleteKnowledgeBase';
import { useKnowledgeBases } from '../hooks/useKnowledgeBases';
import { KnowledgeBaseCard } from './KnowledgeBaseCard';
import { KnowledgeBaseRow } from './KnowledgeBaseRow';

type ViewMode = 'grid' | 'list';
type SortKey = 'updated_desc' | 'name_asc' | 'created_desc';

function ListSkeleton({ view }: { view: ViewMode }) {
  if (view === 'grid') {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-11 rounded-lg" />
      ))}
    </div>
  );
}

export function KnowledgeBaseListView() {
  const { data: knowledgeBases, isPending, isError } = useKnowledgeBases();
  const { data: models } = useModels();
  const deleteKnowledgeBase = useDeleteKnowledgeBase();

  const [view, setView] = useState<ViewMode>('grid');
  const [query, setQuery] = useState('');
  const [modelFilter, setModelFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('updated_desc');

  const modelNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of models ?? []) map.set(m.id, m.name);
    return map;
  }, [models]);

  const embeddingModels = useMemo(() => (models ?? []).filter((m) => m.is_embedding), [models]);

  const filtered = useMemo(() => {
    if (!knowledgeBases) return [];
    const q = query.trim().toLowerCase();
    let list = knowledgeBases.filter((kb) => {
      const matchesQuery =
        !q ||
        kb.name.toLowerCase().includes(q) ||
        kb.slug.toLowerCase().includes(q) ||
        (kb.description ?? '').toLowerCase().includes(q);
      const matchesModel = !modelFilter || kb.embedding_model_id.toString() === modelFilter;
      return matchesQuery && matchesModel;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'name_asc') return a.name.localeCompare(b.name);
      if (sort === 'created_desc') return b.created_at.localeCompare(a.created_at);
      return b.updated_at.localeCompare(a.updated_at);
    });
    return list;
  }, [knowledgeBases, query, modelFilter, sort]);

  const action = (
    <Button size="sm" render={<Link href="/knowledge-bases/new" />}>
      <Plus data-icon="inline-start" />
      Knowledge Base mới
    </Button>
  );

  if (isError) {
    return (
      <PageShell title="Knowledge base" action={action}>
        <EmptyState icon={BookOpen} tone="destructive" title="Không tải được danh sách knowledge base." />
      </PageShell>
    );
  }

  return (
    <PageShell title="Knowledge base" description="Quản lý dữ liệu tri thức cấp cho agent." action={action}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên, slug, mô tả…"
            className="max-w-xs"
          />
          <Select value={modelFilter} onValueChange={setModelFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tất cả embedding model">
                {(value: string | null) => {
                  const model = embeddingModels.find((m) => m.id.toString() === value);
                  return model ? model.name : 'Tất cả embedding model';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {embeddingModels.map((m) => (
                <SelectItem key={m.id} value={m.id.toString()}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort((v as SortKey) ?? 'updated_desc')}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_desc">Mới cập nhật</SelectItem>
              <SelectItem value="name_asc">Tên (A-Z)</SelectItem>
              <SelectItem value="created_desc">Mới tạo</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-1 rounded-lg border border-border p-0.5">
            <Button
              size="sm"
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              onClick={() => setView('grid')}
              aria-label="Xem dạng lưới"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              size="sm"
              variant={view === 'list' ? 'secondary' : 'ghost'}
              onClick={() => setView('list')}
              aria-label="Xem dạng danh sách"
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>

        {isPending && <ListSkeleton view={view} />}

        {!isPending && knowledgeBases?.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title="Chưa có knowledge base nào"
            description="Tạo knowledge base đầu tiên để bắt đầu."
          />
        )}

        {!isPending && (knowledgeBases?.length ?? 0) > 0 && filtered.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title="Không có kết quả phù hợp"
            description="Thử đổi từ khoá tìm kiếm hoặc bộ lọc."
          />
        )}

        {!isPending && filtered.length > 0 && view === 'grid' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((kb) => (
              <KnowledgeBaseCard
                key={kb.id}
                kb={kb}
                embeddingModelName={modelNameById.get(kb.embedding_model_id) ?? `#${kb.embedding_model_id}`}
                onDelete={() => deleteKnowledgeBase.mutate(kb.id)}
                isDeleting={deleteKnowledgeBase.isPending}
              />
            ))}
          </div>
        )}

        {!isPending && filtered.length > 0 && view === 'list' && (
          <div className="overflow-hidden rounded-xl border border-border bg-white/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Embedding model</TableHead>
                  <TableHead>Cập nhật</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((kb) => (
                  <KnowledgeBaseRow
                    key={kb.id}
                    kb={kb}
                    embeddingModelName={
                      modelNameById.get(kb.embedding_model_id) ?? `#${kb.embedding_model_id}`
                    }
                    onDelete={() => deleteKnowledgeBase.mutate(kb.id)}
                    isDeleting={deleteKnowledgeBase.isPending}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {deleteKnowledgeBase.isError && (
          <p className="text-sm text-destructive">{getApiErrorMessage(deleteKnowledgeBase.error)}</p>
        )}
      </div>
    </PageShell>
  );
}
