import { KnowledgeSearchPanel } from './KnowledgeSearchPanel';

/** Tab "Tìm kiếm" — tách khỏi cuối trang chi tiết KB (bản cũ) thành 1 route riêng. */
export function KnowledgeSearchView({ kbId }: { kbId: number }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Tìm kiếm ngữ nghĩa trong toàn bộ chunk của KB này.</p>
      <KnowledgeSearchPanel kbId={kbId} />
    </div>
  );
}
