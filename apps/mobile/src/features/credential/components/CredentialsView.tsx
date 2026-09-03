import { Code2, KeyRound, TriangleAlert } from 'lucide-react-native';
import { ResourceListCard, ScreenScaffold } from '../../../shared/ui';

export function CredentialsView() {
  return (
    <ScreenScaffold
      eyebrow="Security"
      title="Credentials"
      description="Mobile chỉ hiển thị provider readiness trong MVP; secret entry/pairing sẽ nối auth sau."
    >
      <ResourceListCard
        title="Provider readiness"
        description="Secret không nhập bừa trên mobile; chỉ expose readiness/pairing khi backend auth sẵn."
        items={[
          { title: 'Gemini', subtitle: 'Credential configured in backend DB', badge: 'Valid', icon: KeyRound, tone: 'accent' },
          { title: 'OpenAI', subtitle: 'Credential missing or not tested', badge: 'Setup', icon: TriangleAlert },
          { title: 'GitHub', subtitle: 'Readonly connector available', badge: 'Read', icon: Code2 },
        ]}
      />
    </ScreenScaffold>
  );
}
