import { DriveList } from './DriveList';
import { KnowledgeMetrics } from './KnowledgeMetrics';

/** Tab "Files" của trang chi tiết KB — metric tổng quan + UI kiểu Google Drive. */
export function KnowledgeBaseFilesView({ kbId }: { kbId: number }) {
  return (
    <div className="flex flex-col gap-4">
      <KnowledgeMetrics kbId={kbId} />
      <DriveList kbId={kbId} />
    </div>
  );
}
