import Link from 'next/link';
import { Plus } from 'lucide-react';

import { ModelList } from '@/features/model/components/ModelList';
import { CredentialManageDialog } from '@/features/credential';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/layout/PageShell';

export default function ModelsPage() {
  return (
    <PageShell
      title="Model"
      action={
        <div className="flex items-center gap-2">
          <CredentialManageDialog />
          <Button size="sm" render={<Link href="/models/new" />}>
            <Plus data-icon="inline-start" />
            Model mới
          </Button>
        </div>
      }
    >
      <ModelList />
    </PageShell>
  );
}
