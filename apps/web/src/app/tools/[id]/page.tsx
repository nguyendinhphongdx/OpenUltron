import { ToolDetailView } from '@/features/tool';

export default async function ToolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ToolDetailView id={Number(id)} />;
}
