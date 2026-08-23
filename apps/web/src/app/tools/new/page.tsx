import { ToolForm } from '@/features/tool/components/ToolForm';
import { PageShell } from '@/components/layout/PageShell';

export default function NewToolPage() {
  return (
    <PageShell title="Tool mới">
      <ToolForm />
    </PageShell>
  );
}
