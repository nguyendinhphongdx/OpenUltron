import Link from 'next/link';

import { ToolList } from '@/features/tool/components/ToolList';
import { Button } from '@/components/ui/button';

export default function ToolsPage() {
  return (
    <main className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <h1 className="text-lg font-semibold">Tools</h1>
        <Button size="sm" render={<Link href="/tools/new" />}>
          + Tool mới
        </Button>
      </div>
      <ToolList />
    </main>
  );
}
