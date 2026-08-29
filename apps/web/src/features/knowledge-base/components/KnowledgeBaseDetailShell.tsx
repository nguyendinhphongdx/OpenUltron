'use client';

import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';

import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { PageShell } from '@/components/layout/PageShell';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useKnowledgeBase } from '../hooks/useKnowledgeBase';

type Tab = 'files' | 'search' | 'settings';

function tabFromPathname(pathname: string): Tab {
  if (pathname.endsWith('/settings')) return 'settings';
  if (pathname.endsWith('/search')) return 'search';
  return 'files';
}

/** Layout chung cho `/knowledge-bases/[id]/**` — header KB + nav Files/Search/Settings.
 * Route con (`page.tsx`) chỉ parse params + render View; layout này giữ điều hướng dùng chung. */
export function KnowledgeBaseDetailShell({ kbId, children }: { kbId: number; children: ReactNode }) {
  const { data: knowledgeBase, isPending, isError } = useKnowledgeBase(kbId);
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = tabFromPathname(pathname);

  if (isPending) {
    return (
      <PageShell title={`Knowledge base #${kbId}`}>
        <LoadingState label="Đang tải knowledge base…" />
      </PageShell>
    );
  }
  if (isError || !knowledgeBase) {
    return (
      <PageShell title={`Knowledge base #${kbId}`}>
        <EmptyState icon={BookOpen} tone="destructive" title="Không tải được knowledge base." />
      </PageShell>
    );
  }

  return (
    <PageShell title={knowledgeBase.name} description={knowledgeBase.description ?? undefined}>
      <div className="flex flex-col gap-4">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const path =
              value === 'files'
                ? `/knowledge-bases/${kbId}`
                : `/knowledge-bases/${kbId}/${value as string}`;
            router.push(path);
          }}
        >
          <TabsList>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="search">Tìm kiếm</TabsTrigger>
            <TabsTrigger value="settings">Cài đặt</TabsTrigger>
          </TabsList>
        </Tabs>
        {children}
      </div>
    </PageShell>
  );
}
