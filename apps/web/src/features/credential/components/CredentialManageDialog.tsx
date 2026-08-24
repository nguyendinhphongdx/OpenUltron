'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Bot, Cpu, Github, KeyRound, ServerCog, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState, LoadingState } from '@/components/shared/EmptyState';
import { ModelCatalogPanel, useModels } from '@/features/model';
import type { Model, Provider } from '@/features/model';
import { OllamaCatalogPanel } from '@/features/ollama';
import { cn } from '@/lib/utils';

import { useCredentials, useDeleteCredential, useTestConnection, useUpsertCredential } from '../hooks';
import type { Credential, CredentialProvider } from '../types/credential.types';

const PROVIDERS: { id: Provider; label: string; icon: typeof Bot; needsCredential: boolean }[] = [
  { id: 'gemini', label: 'Gemini', icon: Sparkles, needsCredential: true },
  { id: 'openai', label: 'OpenAI', icon: Bot, needsCredential: true },
  { id: 'ollama', label: 'Ollama', icon: Cpu, needsCredential: false },
  { id: 'sglang', label: 'SGLang', icon: ServerCog, needsCredential: false },
];

/** Connector provider (ADR-0015) — khác trục "model provider" ở trên (không có model để list),
 * nhưng tái dùng nguyên credential store/UI. Thêm connector mới (Jira/Confluence...) = thêm 1
 * entry ở đây. */
const CONNECTORS: { id: 'github'; label: string; icon: typeof Bot }[] = [
  { id: 'github', label: 'GitHub', icon: Github },
];

type SidebarId = Provider | 'github';

/** Dialog 3 cột: provider filter → model + capabilities → credential của provider đang chọn.
 * ADR-0010 — 1 credential/provider, không có field "name", self-host (ollama/sglang) không cần
 * credential. Component tự quản lý state (open/active provider) — nơi gọi (`app/models/page.tsx`,
 * `AgentForm`...) chỉ render cái này, không chứa logic (docs/conventions/02-frontend-nextjs.md,
 * "app/ chỉ routing"). `trigger` cho phép đổi nội dung nút mở dialog theo ngữ cảnh gọi (mặc định
 * dùng ở trang Models; AgentForm dùng câu khác cho đúng ngữ cảnh "đang chọn model"). */
export function CredentialManageDialog({ trigger }: { trigger?: ReactNode }) {
  const [checkedProviders, setCheckedProviders] = useState<Set<Provider>>(
    new Set(PROVIDERS.map((p) => p.id)),
  );
  const [activeProvider, setActiveProvider] = useState<SidebarId>('gemini');

  const { data: models, isPending: modelsPending } = useModels();
  const { data: credentials, isPending: credentialsPending } = useCredentials();

  const toggleProvider = (provider: Provider) => {
    setCheckedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  };

  const isConnector = activeProvider === 'github';
  const filteredModels = (models ?? []).filter((m) => checkedProviders.has(m.provider));
  const activeCredential = credentials?.find((c) => c.provider === activeProvider) ?? null;
  const activeProviderMeta = isConnector
    ? { ...CONNECTORS[0], needsCredential: true as const }
    : PROVIDERS.find((p) => p.id === activeProvider)!;

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        {trigger ?? (
          <>
            <KeyRound data-icon="inline-start" />
            Quản lý credential
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>Model & Credential</DialogTitle>
        </DialogHeader>
        <div className="grid h-[28rem] grid-cols-[13rem_1fr_18rem] gap-4 overflow-hidden">
          {/* Cột trái — provider filter */}
          <div className="flex flex-col gap-1 overflow-y-auto border-r border-border pr-3">
            {PROVIDERS.map(({ id, label, icon: Icon }) => (
              <div
                key={id}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors',
                  activeProvider === id ? 'bg-muted' : 'hover:bg-muted/50',
                )}
              >
                <Checkbox
                  checked={checkedProviders.has(id)}
                  onCheckedChange={() => toggleProvider(id)}
                />
                <button
                  type="button"
                  onClick={() => setActiveProvider(id)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="flex-1 font-medium text-foreground">{label}</span>
                  {credentials?.some((c) => c.provider === id && c.is_valid) && (
                    <span className="size-1.5 rounded-full bg-emerald-500" title="Đã có credential hợp lệ" />
                  )}
                </button>
              </div>
            ))}

            <p className="mt-3 border-t border-border pt-3 text-xs font-semibold text-muted-foreground">
              Connector
            </p>
            {CONNECTORS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveProvider(id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors',
                  activeProvider === id ? 'bg-muted' : 'hover:bg-muted/50',
                )}
              >
                <Icon className="size-4 text-muted-foreground" />
                <span className="flex-1 font-medium text-foreground">{label}</span>
                {credentials?.some((c) => c.provider === id && c.is_valid) && (
                  <span className="size-1.5 rounded-full bg-emerald-500" title="Đã có credential hợp lệ" />
                )}
              </button>
            ))}
          </div>

          {/* Cột giữa — model + capabilities (connector không có model, hiện blurb riêng) */}
          <div className="flex flex-col gap-2 overflow-y-auto pr-2">
            {isConnector ? (
              <p className="text-sm text-muted-foreground">
                GitHub connector (ADR-0015) — token dùng cho builtin tool{' '}
                <code className="font-mono">github-search-code</code>/
                <code className="font-mono">github-read-file</code>. Không phải model provider,
                không có model để list ở đây.
              </p>
            ) : modelsPending ? (
              <LoadingState label="Đang tải model…" />
            ) : filteredModels.length === 0 ? (
              <EmptyState icon={Cpu} title="Không có model nào" description="Bỏ chọn ít provider hơn ở cột trái, hoặc tạo model mới." />
            ) : (
              filteredModels.map((model: Model) => (
                <div key={model.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{model.name}</p>
                    <span className="text-xs text-muted-foreground">{model.provider}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{model.model_id}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {model.capabilities?.tools && <Badge variant="secondary">tools</Badge>}
                    {model.capabilities?.vision && <Badge variant="secondary">vision</Badge>}
                    {model.capabilities?.json_mode && <Badge variant="secondary">json_mode</Badge>}
                    {model.capabilities?.thinking && <Badge variant="secondary">thinking</Badge>}
                    {model.capabilities?.context_window && (
                      <Badge variant="secondary">{model.capabilities.context_window} ctx</Badge>
                    )}
                    {!model.capabilities && (
                      <span className="text-xs text-muted-foreground">Chưa có capability trong catalog</span>
                    )}
                  </div>
                </div>
              ))
            )}

            {activeProvider === 'ollama' && (
              <>
                <p className="mt-2 border-t border-border pt-3 text-xs font-semibold text-muted-foreground">
                  Catalog Ollama — pull model về máy
                </p>
                <OllamaCatalogPanel />
              </>
            )}
            {(activeProvider === 'gemini' || activeProvider === 'openai') && (
              <>
                <p className="mt-2 border-t border-border pt-3 text-xs font-semibold text-muted-foreground">
                  Catalog {activeProviderMeta.label} — model đã biết
                </p>
                <ModelCatalogPanel provider={activeProvider} />
              </>
            )}
          </div>

          {/* Cột phải — credential của provider đang chọn */}
          <div className="flex flex-col gap-3 border-l border-border pl-3">
            <p className="text-sm font-semibold text-foreground">{activeProviderMeta.label}</p>
            {!activeProviderMeta.needsCredential ? (
              <p className="text-sm text-muted-foreground">
                Provider tự host — không cần credential.
              </p>
            ) : credentialsPending ? (
              <LoadingState label="Đang tải…" />
            ) : (
              <CredentialForm
                provider={activeProvider as CredentialProvider}
                credential={activeCredential}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CredentialForm({
  provider,
  credential,
}: {
  provider: CredentialProvider;
  credential: Credential | null;
}) {
  const [apiKey, setApiKey] = useState('');
  const upsert = useUpsertCredential();
  const remove = useDeleteCredential();
  const test = useTestConnection();

  return (
    <div className="flex flex-col gap-3">
      {credential && (
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm text-foreground">{credential.masked_key}</span>
            <Badge variant={credential.is_valid ? 'default' : 'destructive'}>
              {credential.is_valid ? 'valid' : 'invalid'}
            </Badge>
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={test.isPending}
              onClick={() => test.mutate(provider)}
            >
              {test.isPending ? 'Đang test…' : 'Test connection'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={remove.isPending}
              onClick={() => {
                if (window.confirm(`Xoá credential ${provider}?`)) remove.mutate(provider);
              }}
            >
              Xoá
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="api-key">{credential ? 'Thay API key' : 'Thêm API key'}</Label>
        <Input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
        />
        <Button
          size="sm"
          disabled={!apiKey || upsert.isPending}
          onClick={() => {
            upsert.mutate({ provider, input: { api_key: apiKey } }, { onSuccess: () => setApiKey('') });
          }}
        >
          {upsert.isPending ? 'Đang lưu…' : 'Lưu'}
        </Button>
        {upsert.isError && (
          <p className="text-sm text-destructive">Không lưu được credential.</p>
        )}
      </div>
    </div>
  );
}
