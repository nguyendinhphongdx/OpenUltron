import Link from 'next/link';
import { Plus } from 'lucide-react';

import { ModelList } from '@/features/model/components/ModelList';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/layout/PageShell';

export default function ModelsPage() {
  return (
    <PageShell
      title="Model"
      action={
        <Button size="sm" render={<Link href="/models/new" />}>
          <Plus data-icon="inline-start" />
          Model mới
        </Button>
      }
    >
      <ModelList />
    </PageShell>
  );
}
