import { BookOpen, FolderKanban, RadioTower } from 'lucide-react-native';
import { ResourceListCard, ScreenScaffold } from '../../../shared/ui';

export function KnowledgeBasesView() {
  return (
    <ScreenScaffold
      eyebrow="Memory"
      title="Knowledge Bases"
      description="Quản lý KB/folder/file và indexing status ở mức mobile-friendly."
    >
      <ResourceListCard
        title="Knowledge bases"
        description="Mobile ưu tiên đọc trạng thái indexing và search nhanh, không biến thành file manager nặng."
        items={[
          { title: 'Product research', subtitle: '24 files · indexing complete', badge: 'Ready', icon: FolderKanban, tone: 'accent' },
          { title: 'Personal notes', subtitle: '8 files · semantic search enabled', badge: 'KB', icon: BookOpen },
          { title: 'Voice references', subtitle: 'Gemini Live, OpenAI Realtime, AG-UI notes', badge: 'New', icon: RadioTower },
        ]}
      />
    </ScreenScaffold>
  );
}
