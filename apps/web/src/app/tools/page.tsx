import Link from 'next/link';
import { Plus } from 'lucide-react';

import { ToolList } from '@/features/tool/components/ToolList';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/layout/PageShell';

export default function ToolsPage() {
  return (
    <PageShell
      title="Tools"
      description="Metadata tool quản lý — chưa gắn vào luồng chat thực tế."
      action={
        <Button size="sm" render={<Link href="/tools/new" />}>
          <Plus data-icon="inline-start" />
          Tool mới
        </Button>
      }
    >
      <ToolList />
    </PageShell>
  );
}
