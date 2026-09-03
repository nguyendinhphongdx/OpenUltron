# Mobile convention — Expo (`apps/mobile`)

Canonical cho `apps/mobile`. Dùng cùng [`09-ui-visual-design.md`](09-ui-visual-design.md): mobile
không phải app CRUD phụ, mà là **ambient companion runtime** cho voice/agent.

## Mục đích

Mobile là surface dùng hằng ngày khi user không muốn mở laptop/browser:

- Nói/nghe với agent qua điện thoại hoặc tai nghe.
- Handoff sang web khi cần xem trace dài, nhưng mobile vẫn phải xem/quản lý được agent,
  conversation, tool, KB và setting chính.
- Chuẩn bị đường lên smartwatch/smart glasses bằng input/output adapter, không tạo agent flow riêng.
- Auth/authz sẽ làm sau, nhưng shell/navigation phải **auth-ready**: không hardcode giả định app mãi
  là local single-screen.

## Stack bắt buộc

- **Expo SDK 57** theo versioned docs do `apps/mobile/AGENTS.md` trỏ tới. Không dùng snippet Expo cũ
  khi version đã đổi.
- **React Native + TypeScript strict**. Không thêm JavaScript file mới.
- **pnpm workspace**. Không chạy `npm install`/`yarn`.
- **Expo official template làm runtime base**; không copy nguyên boilerplate bên thứ ba vào repo.
- **Design system nội bộ** đặt ở `src/shared/theme` và `src/shared/ui` trước. Khi cần component set
  lớn hơn, ưu tiên hướng **NativeWind + React Native Reusables style** vì gần shadcn/web nhất, nhưng
  phải thêm có chủ đích, không cài để “cho có”.
- **React Query** chỉ thêm khi mobile bắt đầu có server-state REST/cache thật. Không dùng
  `useEffect(fetch)` lặp lại nhiều screen.
- **Zod/form library** chỉ thêm khi form validation vượt quá 1-2 field đơn giản. Form nhỏ dùng
  controlled state cục bộ.

## Boilerplate decision

Đã cân nhắc:

- **Ignite** — mạnh về architecture/generator, nhưng kéo nhiều opinion/state/tooling không cần ngay
  cho Ultron companion MVP.
- **Create Expo Stack** — tiện chọn NativeWind/Expo Router, nhưng generator template có thể trễ SDK
  so với Expo SDK 57 hiện tại.
- **React Native Reusables** — tốt cho component/design-system kiểu shadcn, nhưng nên dùng như
  source pattern/copy-paste component, không biến repo thành phụ thuộc UI framework cứng.
- **Expo official SDK 57** — chọn làm base vì khớp version, ít magic, dễ maintain trong monorepo.

Quyết định: bắt đầu từ **Expo SDK 57 official + Ultron feature-folder architecture + shared design
tokens/primitives**. Chỉ thêm NativeWind/React Native Reusables khi có nhu cầu thật về component
library, sau khi cập nhật convention này.

## Navigation

- Phase 1 chỉ có 1 screen → giữ `App.tsx` bootstrap mỏng + `src/screens/HomeScreen.tsx`.
- Khi có từ **2 screen độc lập trở lên** hoặc cần deep link/handoff (`conversation/:id`, settings,
  debug trace) → thêm **Expo Router**. Không tự dựng navigation state bằng `useState`.
- Mobile shell dài hạn dùng **bottom tabs + drawer/sidebar mở bằng nút menu**:
  - Bottom tabs cho surface dùng thường xuyên: `Conversations`, `Agents`, `Tools`,
    `Knowledge Bases`, `Settings`.
  - Primary: `Conversations`, `Agents`, `Tools`, `Knowledge Bases`, `Models`, `Settings`.
  - Secondary/debug: `Orchestrators`, `Credentials`, `Runtime logs` khi có implementation tương ứng.
  - Drawer không phải full admin menu nặng; ưu tiên quick switch conversation/agent và trạng thái
    runtime đang hoạt động.
- Route dự kiến khi thêm Expo Router:
  - `/` hoặc `/conversations` — conversation inbox + active voice/chat entry.
  - `/conversations/[id]` — chat/voice session.
  - `/agents`, `/agents/[id]` — agent list/detail.
  - `/tools`, `/knowledge-bases`, `/models` — mobile management surface đủ dùng.
  - `/settings` — power settings cho API, voice, background, wake phrase, device, privacy.
- Route file chỉ compose View/screen; logic feature vẫn nằm trong `src/features/**`.
- Navigation params phải là primitive/string. Object phức tạp đi qua cache/store/service, không nhồi
  JSON vào route.

## Auth/authz readiness

- Chưa implement auth/authz trong MVP, nhưng code mobile không được chặn đường thêm auth sau này.
- API client phải có chỗ cắm `getAccessToken()`/auth header ở `src/shared/services/api`, dù ban đầu
  trả `null`.
- Route/screen nên phân biệt rõ public/onboarding/settings với authenticated app shell khi thêm auth.
- Không nhồi user/workspace/RBAC vào domain hiện tại khi backend chưa có ADR; chỉ chuẩn bị seam ở
  API client/navigation.
- Token nhạy cảm sau này lưu qua secure storage wrapper, không component nào tự gọi storage trực tiếp.

## State management

- **Server state**: dùng React Query khi có list/detail/mutation thật (`conversations`, `agents`,
  `health`, `voice sessions`, `tools`, `knowledge bases`, `models`, `settings`). Query key đặt gần
  service/hook của feature.
- **Local UI state**: `useState`/`useReducer` trong component/hook; không thêm global store.
- **Global client state** chỉ dùng khi có state share nhiều screen không phải server state
  (`apiBaseUrl`, last selected conversation, theme). Mặc định lưu qua storage wrapper trong
  `src/shared/services/storage`.
- **Zustand/Redux/Jotai** không được thêm để “dự phòng”. Nếu thật sự cần global store, phải bổ sung
  convention/ADR nhỏ ghi rõ state nào, lifecycle nào.

## Storage và config

- Tạo wrapper storage trước khi dùng thư viện cụ thể:
  - `src/shared/services/storage/storage.service.ts`
  - export function typed: `getApiBaseUrl`, `setApiBaseUrl`, `getLastConversationId`,
    `setLastConversationId`, `getWakePhrase`, `setWakePhrase`, `getBackgroundMode`,
    `setBackgroundMode`.
- Không gọi trực tiếp `AsyncStorage`/`SecureStore`/`MMKV` từ component.
- Dữ liệu thường (`apiBaseUrl`, last conversation id, UI preference) dùng async storage/MMKV khi
  thêm dependency.
- Secret/token/API key không lưu ở mobile MVP. Credential provider vẫn nằm trong `apps/api`.
- Nếu sau này cần token nhạy cảm cho companion pairing, dùng `expo-secure-store` hoặc keychain-backed
  storage qua wrapper; không dùng plain async storage.
- Config build-time đặt trong `app.config.ts`/Expo config; config user nhập runtime nằm trong storage.

## Feature surfaces

- `conversation` — danh sách hội thoại, tạo hội thoại mới, chat/voice trong 1 conversation, load
  history sau reload.
- `agent` — danh sách agent, agent detail/readiness, chọn agent mặc định cho conversation mới.
- `tool` — danh sách tool, trạng thái enabled/approval, detail đủ đọc/debug; chỉnh sửa sâu có thể
  handoff web nếu mobile chưa đủ.
- `knowledge-base` — danh sách KB/folder/file, trạng thái indexing, search/read chunk tối thiểu.
- `model`/`credential` — xem trạng thái provider/model; credential secret ưu tiên quản lý ở web/API,
  mobile chỉ hiển thị/readiness hoặc pairing sau này.
- `settings` — power surface cho API base URL, auth/pairing, voice provider, wake phrase, background,
  device/audio, privacy, logs.

Tên feature folder dùng singular giống web khi đã có convention (`agent`, `conversation`,
`knowledge-base`, `tool`, `model`, `settings`, `voice`).

## API và transport client

- `src/shared/services/api` chứa base client/helper chung (`buildApiUrl`, `buildWsUrl`,
  parse error). Feature service không tự nối protocol rải rác.
- REST response type đặt trong `features/<name>/types`, khớp schema backend thật; không đoán field.
- WebSocket/realtime client phải normalize event thô thành event nội bộ của Ultron trước khi tới hook.
- Component không biết endpoint path cụ thể; component gọi hook/service theo intent (`start`,
  `stop`, `sendText`, `checkConnection`).

## Kiến trúc thư mục

```text
apps/mobile/
  App.tsx              # bootstrap rất mỏng
  src/
    screens/           # screen-level composition, không chứa transport detail
    features/
      <feature>/
        types/
        services/
        hooks/
        components/
        index.ts
    shared/
      services/        # API/WebSocket/storage client dùng chung
      theme/           # token màu/spacing/radius/type
      ui/              # primitive component nội bộ
```

Rule giống web: `types → services → hooks → components/screens`. Tầng trên được import tầng dưới;
service không import React; component không hardcode protocol chi tiết nếu service/hook đã cover.

## Component và design system

- UI primitive dùng chung phải ở `src/shared/ui`, không copy-paste button/input/card mỗi feature.
- Màu/spacing/radius lấy từ `src/shared/theme/tokens.ts`; không hardcode palette mới trong feature.
- Touch target tối thiểu **44px**, mặc định button/input 48px.
- Screen mobile dùng Safe Area, keyboard-aware/scroll rõ ràng khi có form dài.
- Voice state phải first-class: `listening`, `thinking`, `speaking`, `using_tool`, `error`.
- Empty/loading/error state nằm gần thao tác vừa xảy ra, không toast-only cho lỗi quan trọng.
- Component `src/shared/ui` là primitive có accessibility/touch behavior chuẩn; feature component là
  composition theo domain, không chứa lại style primitive.
- Nếu thêm NativeWind, utility class chỉ được dùng sau khi map được token Ultron vào theme; không
  dùng palette Tailwind trực tiếp thay token.

## Forms

- Form đơn giản dùng controlled state cục bộ + validate tại submit.
- Form phức tạp hoặc lặp lại nhiều screen mới thêm form library; ưu tiên TanStack Form hoặc
  react-hook-form + Zod, nhưng phải cập nhật convention trước khi cài.
- Error hiện dưới field liên quan, không chỉ alert/toast.
- Input text dài phải xử lý keyboard và scroll; CTA không được bị keyboard che.

## Audio, permission, background

- Dùng `expo-audio` theo Expo SDK 57 cho playback/recording khi bắt đầu wire mic thật.
- Mic permission copy phải rõ lý do: Ultron cần ghi âm để gửi voice session tới agent cá nhân.
- Foreground voice session là scope mặc định. Background recording/always-listening/wake word là
  quyết định riêng vì ảnh hưởng battery, privacy, Android foreground service và iOS background mode.
- Wake phrase là **power setting**, không hardcode. Default ban đầu nên disabled; user bật thủ công.
- Wake phrase thay đổi behavior nghe nền → cần spec/ADR riêng trước khi code wake/background thật.
- Barge-in phải ưu tiên UX tức thì: client dừng playback/local queue ngay khi nhận interrupted event,
  không đợi backend turn hoàn tất.
- Audio buffer/playback/recorder object phải có lifecycle cleanup trong hook/service; không tạo object
  dài hạn trong render component.
- Không lưu audio file trong MVP; nếu sau này lưu audio segment phải quay lại spec/domain trước.

## Data và transport

- Mobile gọi `apps/api`, không gọi Gemini/OpenAI/provider trực tiếp trong MVP.
- REST/WebSocket path tập trung ở `src/shared/services` hoặc service của feature; component không tự
  dựng URL rải rác.
- Base URL là setting runtime. Trên device thật phải hỗ trợ IP LAN, không giả định `localhost`.
- Voice/audio là input adapter của agent thường; không tạo domain `MobileConversation` riêng.
- Khi mobile có full resource screens, ưu tiên reuse endpoint hiện có của web/API thay vì tạo endpoint
  “mobile-only” nếu shape domain giống nhau.

## Testing, lint, và quality gate

- `typecheck` là gate bắt buộc cho mọi thay đổi mobile.
- Thêm `lint` cho `apps/mobile` trước khi app vượt MVP 1 screen. Khi đã có lint, root pre-commit/CI
  phải gọi mobile lint giống web.
- Unit/component test dùng Jest + React Native Testing Library theo Expo docs khi có logic/hook quan
  trọng hoặc bug regression.
- E2E mobile chỉ thêm khi có flow cần verify trên device/simulator (voice start/stop, permission,
  background behavior); ưu tiên Maestro nếu cần vì nhẹ hơn Detox cho MVP.
- Không mock quá sâu realtime transport trong test hook: service client có test normalize event, hook
  test state transition.

## References đã tham khảo

- Expo SDK 57 docs — versioned source bắt buộc cho API Expo hiện tại.
- Expo `expo-audio` docs — recording/playback, config plugin, background playback/recording caveat.
- Obytes React Native Template — tham khảo Expo + PNPM + TypeScript + Tailwind/NativeWind + React
  Query + form/testing/EAS practices, nhưng không copy nguyên template.
- Ignite — tham khảo tư duy generator/boilerplate battle-tested, nhưng không chọn làm base vì kéo
  opinion/tooling và version SDK khác.
- React Native Reusables — tham khảo hướng shadcn-like component với NativeWind/Uniwind.
- Expo blog về NativeWind UI — tham khảo reusable component/theming/design-in-code workflow.

## Anti-pattern

- ❌ Copy nguyên boilerplate lớn rồi để folder/example thừa trong repo.
- ❌ Nhồi toàn bộ session logic vào `App.tsx` hoặc một screen duy nhất.
- ❌ Mỗi component tự định nghĩa màu/shadow/radius riêng.
- ❌ Mobile gọi provider AI trực tiếp và bypass credential/tool/KB/orchestrator của backend.
- ❌ Thêm Redux/Zustand/MobX chỉ để lưu form/local UI state.
- ❌ Background always-listening/wake word khi chưa có spec/ADR về permission, battery, privacy.
- ❌ Thiết kế mobile như 1 màn voice duy nhất, làm cụt đường tới drawer/resource/settings full app.
- ❌ Chỉ có drawer mà không có bottom tabs cho các surface người dùng chạm hằng ngày.
- ❌ Component trực tiếp đọc/ghi storage hoặc tự dựng WebSocket URL khi đã có service wrapper.
- ❌ Cài UI kit/state/form/test library mới mà không cập nhật convention trước.

## Self-check trước khi xong

- [ ] Đã đọc Expo SDK 57 docs theo `apps/mobile/AGENTS.md` trước khi dùng API Expo mới?
- [ ] File mới đặt đúng `features/<name>/{types,services,hooks,components}` hoặc `shared/*`?
- [ ] Nếu app có nhiều hơn 1 surface, đã dùng bottom tabs + drawer/Expo Router thay vì `useState`
      đổi màn?
- [ ] API client có seam auth-ready, nhưng không tự thêm RBAC/user domain khi backend chưa có ADR?
- [ ] Service/hook/component tách rõ, `App.tsx` bootstrap mỏng?
- [ ] UI dùng token/shared primitive, không hardcode style rải rác?
- [ ] REST/WebSocket/storage đi qua service wrapper, không gọi trực tiếp từ component?
- [ ] Touch target/focus/loading/error state đạt mobile baseline?
- [ ] Mobile chỉ gọi `apps/api`, không bypass runtime agent/provider?
- [ ] Mic/background/permission thay đổi có spec/ADR nếu vượt foreground MVP?
- [ ] `pnpm --filter @ultron/mobile typecheck` xanh?
