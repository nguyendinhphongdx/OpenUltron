import { NewModelView } from '@/features/model';
import { PageShell } from '@/components/layout/PageShell';

export default async function NewModelPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string; model_id?: string; name?: string }>;
}) {
  const params = await searchParams;
  return (
    <PageShell title="Model mới">
      <NewModelView initial={params} />
    </PageShell>
  );
}
