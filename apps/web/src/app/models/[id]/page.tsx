import { ModelDetailView } from '@/features/model';

export default async function ModelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ModelDetailView id={Number(id)} />;
}
