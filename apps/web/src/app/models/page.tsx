import Link from 'next/link';

import { ModelList } from '@/features/model/components/ModelList';
import { Button } from '@/components/ui/button';

export default function ModelsPage() {
  return (
    <main className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <h1 className="text-lg font-semibold">Model</h1>
        <Button size="sm" render={<Link href="/models/new" />}>
          + Model mới
        </Button>
      </div>
      <ModelList />
    </main>
  );
}
