import { GitBranch, Workflow } from 'lucide-react-native';
import { ResourceListCard, ScreenScaffold } from '../../../shared/ui';

export function OrchestratorsView() {
  return (
    <ScreenScaffold
      eyebrow="Graphs"
      title="Orchestrators"
      description="Mobile xem topology/readiness; graph editor sâu vẫn hợp với web canvas hơn."
    >
      <ResourceListCard
        title="Orchestrator apps"
        description="Mobile xem graph readiness và chạy nhanh; canvas editor vẫn hợp web hơn."
        items={[
          { title: 'Launch ops supervisor', subtitle: 'Supervisor + 3 sub-agents · nested approval planned', badge: 'Draft', icon: Workflow },
          { title: 'Research pipeline', subtitle: 'Search → summarize → critique', badge: 'Run', icon: GitBranch, tone: 'accent' },
        ]}
      />
    </ScreenScaffold>
  );
}
