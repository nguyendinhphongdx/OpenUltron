import { BrainCircuit, Cpu, RadioTower } from 'lucide-react-native';
import { ResourceListCard, ScreenScaffold } from '../../../shared/ui';

export function ModelsView() {
  return (
    <ScreenScaffold
      eyebrow="Providers"
      title="Models"
      description="Theo dõi model/provider readiness. Credential secret vẫn ưu tiên quản lý qua API/web."
    >
      <ResourceListCard
        title="Model catalog"
        description="Readiness theo provider, không để user đoán model nào có voice/tool/embedding."
        items={[
          { title: 'gemini-3.6-flash', subtitle: 'Text + tool calling · default agent model', badge: 'Default', icon: BrainCircuit, tone: 'accent' },
          { title: 'OpenAI Realtime', subtitle: 'Future realtime voice provider seam', badge: 'Later', icon: RadioTower },
          { title: 'SGLang self-host', subtitle: 'OpenAI-compatible local endpoint', badge: 'Local', icon: Cpu },
        ]}
      />
    </ScreenScaffold>
  );
}
