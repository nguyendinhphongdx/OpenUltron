import { ToolForm } from '@/features/tool/components/ToolForm';

export default function NewToolPage() {
  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-lg font-semibold">Tool mới</h1>
      <ToolForm />
    </main>
  );
}
