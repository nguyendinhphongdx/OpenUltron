# Frontend convention — Next.js (`apps/web`)

Canonical — `apps/web/CLAUDE.md` chỉ trỏ về đây. Scaffold ban đầu adapt từ một Next.js console nội
bộ khác (feature-folder layering + react-query pattern) — bỏ phần tenant/workspace/session-refresh
vì Ultron [là công cụ 1 người dùng](../../AGENTS.md), chưa có auth ở `apps/api`.

## Mục đích

Web console — chat với agent (orchestrator + sub-agent) và quản lý agent org chart
([ADR-0006](../adr/0006-multi-agent-org-chart.md)). Gọi thẳng `apps/api`, không qua gateway.
Visual direction bắt buộc nằm ở [`09-ui-visual-design.md`](09-ui-visual-design.md): Ultron là
chat-first AI workspace theo style **Soft Glass Workspace Console**, không phải generic admin
dashboard.

## Stack bắt buộc — không tự đổi/thêm song song

- **Next.js App Router**, `output: 'standalone'` — deploy riêng khỏi `apps/api`. Chưa dùng Server
  Components/API routes (`app/api/*`) cho backend logic — mọi data vẫn qua `apps/api` (client-side
  fetch, `'use client'` cho component fetch/tương tác).
- **Tailwind CSS** — mọi style qua utility class. Không CSS Modules, không `styled-components`,
  không inline `style={{}}` trừ giá trị động tính toán runtime (ví dụ width % từ data) mà Tailwind
  không diễn tả được bằng class tĩnh.
- **shadcn/ui** cho MỌI primitive UI (button, input, dialog, select...). Cần primitive chưa có ở
  `src/components/ui/` → chạy `pnpm dlx shadcn@latest add <name>` để generate đúng convention
  shadcn, **không tự viết tay 1 component "trông giống" thay thế** — dễ lệch a11y/behavior mà
  shadcn đã lo sẵn (keyboard nav, focus trap, ARIA).
- **Visual design** theo [`09-ui-visual-design.md`](09-ui-visual-design.md) cho màu, layout,
  typography, chat/voice state, table/list và anti-pattern. Không tự chọn palette/style mới trong
  từng feature.
- **`@tanstack/react-query`** cho toàn bộ server state (không dùng `useEffect` + `fetch` tay, không
  thêm Redux/Zustand/Jotai cho state đến từ API — chỉ dùng state client cục bộ (`useState`) cho UI
  state thuần, ví dụ form input trước submit, tab đang mở).

## Kiến trúc: `app/` chỉ routing, `features/<name>/` chứa logic + view

Đây là rule quan trọng nhất — vi phạm nhiều nhất trong code hiện tại (ví dụ cần sửa khi đụng tới:
`src/app/agents/[id]/AgentDetailClient.tsx` đang nằm sai vị trí, xem "Vi phạm đã biết" dưới).

**`app/<route>/page.tsx` (và `layout.tsx`/`loading.tsx`/`error.tsx`) chỉ được làm 2 việc**:

1. Đọc `params`/`searchParams` Next.js cấp cho route đó.
2. Render **1 View component** import từ `features/<name>/`, truyền id/query đã parse xuống làm
   props.

```tsx
// ✅ app/agents/[id]/page.tsx — đúng: chỉ routing
import { AgentDetailView } from '@/features/agent';

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AgentDetailView id={Number(id)} />;
}
```

**KHÔNG được có trong `app/`**: hook (`useXxx`), `useState`/`useRouter` logic, event handler
(`onClick` xử lý business), gọi `useQuery`/`useMutation`, file `'use client'` riêng đặt cùng thư
mục route (kiểu `AgentDetailClient.tsx` cạnh `page.tsx`). Tất cả những cái đó là **View component**,
sống ở `features/<name>/components/`, tên `<Feature><Việc>View.tsx` (`AgentDetailView.tsx`,
`AgentFormView.tsx`) — phân biệt với component nhỏ dùng lại nhiều nơi (không có suffix `View`).

**page.tsx được phép có layout wrapper** (`<main className="...">` sizing/spacing) CHỈ khi wrapper
đó dùng đúng 1 lần, route-specific thật. Pattern lặp lại ≥ 3 route (ví dụ khung `<main
className="mx-auto max-w-2xl">` + header `h1` + nút action đang lặp ở `agents/`, `models/`,
`tools/`, `knowledge-bases/` hiện tại) → **phải** extract thành shared component
`src/components/layout/PageShell.tsx` (props `title`, `action?`) khi đụng tới file đó, không tiếp
tục copy-paste thêm route mới theo pattern cũ.

### Vi phạm đã biết trong code hiện tại (fix khi đụng tới file đó, không phải rescan toàn app ngay)

- `src/app/agents/[id]/AgentDetailClient.tsx` — chứa `useAgent`/`useDeleteAgent`, `handleDelete`,
  `window.confirm`, render nhiều `<section>` — toàn bộ đây là 1 View. Khi sửa file này lần sau: di
  chuyển sang `src/features/agent/components/AgentDetailView.tsx`, đổi `page.tsx` thành chỉ gọi nó.
- Header pattern (`h1` + nút action bên phải trong `<div className="flex items-center
  justify-between border-b ...">`) lặp ở `agents/page.tsx` và tương tự các route khác — candidate
  cho `PageShell` nói trên khi có route thứ 4+ cần cùng pattern.

## Feature-folder layering (`src/features/<name>/`)

`types/ → services/ → hooks/ → components/`, mỗi tầng chỉ import tầng dưới nó. **Mỗi tầng có barrel
`index.ts` riêng** (không chỉ 1 barrel gốc `features/<name>/index.ts`) — feature mới phải export đủ
4 barrel (`types/index.ts`, `services/index.ts`, `hooks/index.ts`, `components/index.ts`), import từ
ngoài feature luôn qua barrel, không import thẳng file lẻ xuyên tầng (`from '../services/x.service'`
ở `components/`). Xem `src/features/conversation/` làm mẫu đầy đủ nhất hiện có.

- `types/` — type request/response khớp `apps/api/app/modules/**/schemas.py` (field giữ
  `snake_case`, xem [`05-naming.md`](05-naming.md)). Đổi shape BE → sửa ở đây trước.
- `services/` — gọi `apiClient` (từ `@/lib/api`), map response, **không import React, không hook**.
  Đây là tầng **DUY NHẤT** biết chi tiết integration bên ngoài (REST thường/SSE/AG-UI, endpoint cụ
  thể) — `hooks/`/`components/` không được biết transport bên dưới, chỉ gọi qua service/hook. Ví dụ
  thật: `apps/api` giữ song song route `/chat` (cũ) + `/chat/agui` (mới, ADR-0019) trong lúc
  migrate — `apps/web` swap được từ SSE tự parse sang AG-UI runtime chỉ bằng cách đổi
  `services/conversation.service.ts`/`ConversationRuntime.tsx` (nơi duy nhất biết endpoint), không
  phải sửa `MessageThread.tsx`/`ChatMessage.tsx` hay bất kỳ component hiển thị nào — đúng tinh thần
  "đổi 1 linh kiện không vỡ linh kiện khác".
- `hooks/` — `useQuery`/`useMutation` wrap service. 1 hook = 1 trách nhiệm (`useAgent`,
  `useDeleteAgent`) — không gộp nhiều action không liên quan vào 1 hook lớn.
- `components/` — chia 2 loại, đừng trộn:
  - **View** (`<Feature><Việc>View.tsx`) — 1 route ↔ 1 View, gọi hook, quản lý loading/error state,
    compose các component nhỏ bên dưới. Chỉ có ở đây, không có nơi khác trong feature gọi hook data
    trực tiếp trừ khi bản thân nó cũng cần độc lập tái sử dụng (ví dụ `AgentList` được cả
    `AgentsPage` và có thể chỗ khác dùng — vẫn OK là 1 hook-calling component nếu tái sử dụng thật,
    không nhất thiết mọi thứ phải quy về đúng 1 View).
  - **Presentational** — nhận data qua props, không tự fetch, dễ test/dùng lại (`AgentCard`,
    `DelegationRow`).

## Component đủ nhỏ để dễ đọc/sửa

- 1 component = 1 trách nhiệm. Component render nhiều `<section>` khác nhau (như
  `AgentDetailClient` hiện tại: form + delegation + nút xoá) → tách mỗi `<section>` thành 1
  component con nếu phần đó có ≥ 1 state/hook riêng hoặc > ~40 dòng JSX.
- File component > ~150 dòng là dấu hiệu nên tách — không phải rule cứng đếm dòng, nhưng nếu phải
  cuộn nhiều màn hình để đọc hết 1 component thì đã quá lớn.
- Đặt tên theo **việc nó làm**, không theo vị trí kỹ thuật (`AgentDeleteButton` không phải
  `Section3`).

## Helper/code chung — viết 1 nơi, không lặp mỗi màn cần gì viết tại chỗ

- **Trước khi viết** 1 helper/format/validate mới trong 1 feature: kiểm `src/lib/utils.ts` (pure
  helper cross-feature, hiện có `cn()`) và `src/lib/api/` (client/endpoints/error parsing) đã có
  chưa — đọc hết file đó trước khi quyết định viết thêm.
- Helper dùng ở ≥ 2 feature → đưa vào `src/lib/` (tạo file mới trong `src/lib/` nếu chưa có nhóm phù
  hợp, ví dụ `src/lib/format.ts` cho hàm format ngày/số) — không copy-paste giữa
  `features/<a>/` và `features/<b>/`.
- Component UI thuần dùng ≥ 2 feature, không phải shadcn primitive, không phải layout shell toàn
  app → `src/components/shared/` (ví dụ `EmptyState`, `ConfirmDialog` wrapper quanh shadcn
  `AlertDialog`, `PageShell` nói ở trên). Chưa có folder này — tạo khi có component đầu tiên thật
  cần, không tạo trước khi có ca dùng.
- `src/lib/api/endpoints.ts` là nơi duy nhất khai path — service không hardcode string URL rải rác.
- `NEXT_PUBLIC_*` đọc **runtime** qua `next-runtime-env` (`src/constants/env.ts` +
  `<PublicEnvScript />` ở `app/layout.tsx`) — KHÔNG bake lúc build, KHÔNG đọc
  `process.env.NEXT_PUBLIC_*` trực tiếp.

## Trước khi code — đọc bức tranh tổng thể, không code mù

Trước khi thêm hook/component/service mới, đọc (không chỉ file định sửa):

1. Toàn bộ `src/features/<name>/` liên quan (cả 4 tầng) — feature đã có sẵn gì, tránh viết lại hàm
   đã có tên khác.
2. `src/components/ui/` — primitive cần đã có shadcn component chưa.
3. `src/lib/` (`utils.ts`, `api/`) — helper cần đã có chưa.
4. `apps/api/app/modules/<name>/schemas.py` thật — không đoán shape field.

## Anti-pattern (tránh over-engineering do AI tự thêm)

- ❌ Thêm tenant/workspace/session-refresh/multi-locale khi chưa có ADR quyết định khác — vi phạm
  [rule #6](../../AGENTS.md).
- ❌ Logic/hook/event handler đặt trong `app/` — luôn ở `features/<name>/components/` (View).
- ❌ Gọi thẳng DB hoặc chứa business rule ở đây — luôn qua API `apps/api`.
- ❌ Viết lại type FE tay theo trí nhớ — đối chiếu `apps/api/app/modules/**/schemas.py` trước.
- ❌ Đọc `process.env.NEXT_PUBLIC_*` trực tiếp — dùng `ENV` từ `src/constants/env.ts`.
- ❌ Tự viết component thay thế shadcn primitive đã có sẵn/generate được.
- ❌ Thêm state management library (Redux/Zustand/Jotai/Context tự chế cho server state) khi
  `react-query` + `useState` cục bộ đã đủ — chỉ thêm khi có nhu cầu thật (state phức tạp share
  nhiều component không liền cây, không phải "để dự phòng sau này".
- ❌ Custom hook chỉ wrap 1 hook khác mà không thêm logic gì (`useAgentWrapper` gọi `useAgent` rồi
  return nguyên `y` — không có giá trị, xoá đi dùng thẳng `useAgent`).
- ❌ Copy-paste component/helper giữa 2 feature thay vì đưa lên `src/lib/`/`src/components/shared/`.

## Testing

Xem [`03-testing.md`](03-testing.md) — canonical duy nhất (tool, folder, cách mock, self-check).
Không liệt kê lại ở đây.

## Self-check trước khi xong

> Checklist canonical duy nhất cho `apps/web` — `frontend-engineer`/`code-reviewer`/`qa-engineer`
> trỏ vào đây, KHÔNG liệt kê lại trong prompt agent (AGENTS.md rule 4). Sửa checklist → sửa ở đây.

- [ ] `app/**/page.tsx` chỉ đọc `params`/`searchParams` + render 1 View — không hook/logic/handler
      ở `app/`?
- [ ] View/component mới đặt đúng `features/<name>/components/`, đúng suffix `View` nếu là
      route-level?
- [ ] Feature-folder layering đúng thứ tự import (`types → services → hooks → components`), mỗi
      tầng có barrel `index.ts` riêng, import từ ngoài feature qua barrel (không xuyên tầng)?
- [ ] Type trong `types/` khớp `apps/api/app/modules/**/schemas.py` thật (không đoán/nhớ nhầm)?
- [ ] Không có business logic/fetch trực tiếp trong `components/`/`hooks/` (nằm ở `services/`)?
- [ ] Primitive UI mới dùng shadcn (generate qua `pnpm dlx shadcn@latest add`), không tự viết tay?
- [ ] Visual direction khớp [`09-ui-visual-design.md`](09-ui-visual-design.md) — chat-first,
      low-contrast workspace, màu/token/layout nhất quán?
- [ ] Helper/component dùng ≥ 2 feature đã lên `src/lib/`/`src/components/shared/`, không
      copy-paste?
- [ ] Không hardcode URL — path khai ở `src/lib/api/endpoints.ts`?
- [ ] `NEXT_PUBLIC_*` đọc qua `ENV` (`src/constants/env.ts`), không đọc `process.env.*` trực tiếp?
- [ ] Không thêm Server Component/`app/api/*` chứa backend logic?
- [ ] Không có tenant/workspace/session-refresh/multi-locale mới, không thêm state-management
      library mới ngoài react-query?
- [ ] `pnpm --filter @ultron/web lint && pnpm --filter @ultron/web typecheck && pnpm --filter @ultron/web build` xanh?
- [ ] Nếu feature có test — dùng đúng baseline Vitest + Testing Library (`03-testing.md`), đã chạy
      `pnpm --filter @ultron/web test` thật (không suy đoán từ đọc code)?
- [ ] Convention chưa cover case này → đã đề xuất bổ sung trước khi code (không tự nghĩ pattern
      riêng)?
