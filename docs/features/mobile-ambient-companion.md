# Feature: Mobile Ambient Companion

Status: in-progress

## Vấn đề / động lực

Ultron hiện chủ yếu chạy qua web: user phải mở laptop/browser, gõ hoặc bấm nút mic trong UI. Điều này
không khớp tầm nhìn ambient AI — người dùng muốn đeo tai nghe, đi lại, làm việc khác mà vẫn nói/nghe
với agent nhanh như gọi một người thật. Mobile phải là bước trung gian thực tế: điện thoại giữ network,
credential/session và audio runtime; tai nghe/đồng hồ/kính là input/output surface nhẹ hơn ở các phase
sau.

## Mục tiêu (Goals)

- Scaffold `apps/mobile` bằng Expo/React Native theo monorepo hiện tại (`pnpm`, TypeScript).
- Chốt convention mobile trước khi mở rộng app để mọi coding agent cùng dùng một kiến trúc/design
  system.
- Làm app companion tối thiểu: chọn/cấu hình API base URL, xem trạng thái kết nối, bắt đầu/dừng voice
  session cho một conversation có sẵn.
- Định hướng mobile thành full companion console về sau: bottom tabs cho surface chính, drawer/menu
  mở bằng nút cho menu đầy đủ, có conversation, agent, tool, knowledge base, model và settings, không
  chỉ là một voice widget.
- Reuse backend voice WebSocket hiện có; mobile chỉ là client/input adapter, không tạo flow agent mới.
- Thiết kế UI theo Soft Glass Workspace Console: light-first, touch target rõ, state `listening`,
  `thinking`, `speaking`, `using_tool` nhìn thấy ngay.
- Chuẩn bị cấu trúc file maintainable để sau này thêm smartwatch/glasses adapter mà không viết lại
  agent runtime.

## Ngoài phạm vi (Non-goals)

- Chưa làm app Apple Watch/Wear OS/smart glasses native trong phase này.
- Chưa đổi kiến trúc backend voice top-level turn; phần đó thuộc epic "Voice là input modality của agent
  thường" và cần spec/ADR riêng nếu thay đổi runtime.
- Chưa implement auth/authz, nhưng mobile shell/API client phải để sẵn seam để thêm sau.
- Chưa build đủ toàn bộ screen Agent/Tool/KB/Model trong MVP đầu tiên; spec này chỉ chốt hướng để
  không thiết kế cụt từ đầu.
- Chưa lưu audio file; tiếp tục chỉ lưu transcript/message theo quyết định trong `live-voice-agent.md`.
- Chưa implement wake word/background always-listening do ràng buộc OS permission và battery.
- Chưa thêm push notification/proactive agent.

## Thiết kế

### Flow MVP

1. User mở app mobile, nhập API base URL nếu chưa có.
2. App kiểm tra health/API reachability và hiển thị trạng thái.
3. User dùng bottom tabs để vào nhanh `Conversations`, `Agents`, `Tools`, `Knowledge Bases`,
   `Settings`; drawer/menu mở bằng nút để vào menu đầy đủ gồm `Models`, `Orchestrators`,
   `Credentials`, `Runtime Logs`.
4. MVP đầu tiên có thể nhập conversation ID thủ công, nhưng route/shell phải sẵn đường thay bằng
   conversation picker.
5. User bấm Start Voice, app mở WebSocket tới backend voice endpoint tương ứng.
6. App capture mic/audio và nhận event state/transcript/audio từ backend.
7. Khi user dừng session, app đóng WebSocket và giữ conversation ID để lần sau nối lại nhanh.

### App shell dài hạn

- Bottom tabs có primary nav: Conversations, Agents, Tools, Knowledge Bases, Settings.
- Drawer mở bằng nút menu, có full nav: Conversations, Agents, Tools, Knowledge Bases, Models,
  Settings, Orchestrators, Credentials, Runtime Logs.
- Settings là power surface: API base URL, auth/pairing sau này, background mode, wake phrase,
  device/audio, privacy/logs.
- Auth/authz làm sau nhưng API client/navigation không được hardcode giả định app mãi không có auth.

### Cấu trúc dự kiến

- `apps/mobile/App.tsx` — bootstrap mỏng; nếu app chuyển sang nhiều route, thêm Expo Router theo
  convention mobile trước khi mở rộng navigation.
- `apps/mobile/src/features/voice/` — voice session UI, hooks, service client.
- `apps/mobile/src/features/settings/` — API base URL setting.
- `apps/mobile/src/shared/` — design tokens, primitives nhỏ, config storage.
- `docs/conventions/11-mobile-expo.md` — canonical cho architecture/design-system mobile.
- `apps/mobile/src/shared/services/api/` — helper dựng REST/WebSocket URL dùng chung trước khi mobile
  có thêm nhiều endpoint.
- `apps/mobile/src/shared/services/storage/` — wrapper lưu `apiBaseUrl` và conversation gần nhất khi
  thêm dependency storage.

### Nguyên tắc kiến trúc

- Mobile không gọi provider Gemini/OpenAI trực tiếp trong MVP; tất cả đi qua `apps/api` để dùng chung
  credential, agent runtime, tool, KB, MCP/orchestrator và approval policy.
- Surface khác nhau chỉ khác adapter input/output: web text, web voice, mobile voice, wearable sau này.
- State machine UI không phụ thuộc provider event thô; service client normalize thành state nội bộ.
- Wake phrase/background listening là power capability có privacy/battery impact; default disabled và
  cần spec/ADR riêng trước khi code thật.

## Câu hỏi mở

- Voice mobile nên dùng WebSocket audio relay hiện có trước, hay chuyển sang WebRTC khi thêm OpenAI
  Realtime/browser-native/mobile-native provider?
- Conversation picker có cần tạo conversation mới ngay trong mobile MVP, hay phase đầu chỉ nhập ID để
  tránh mở rộng quá nhiều UI CRUD?
- Background mode: session có được tiếp tục khi app lock màn hình không, hay phase đầu chỉ foreground?
- Auth/authz sau này dùng pairing token, local account, hay OAuth? Chưa quyết trong MVP.
- Wake phrase chạy local on-device hay server-side VAD/provider-side? Cần research riêng.

## Acceptance criteria

- [ ] `apps/mobile` chạy được bằng `pnpm --filter @ultron/mobile dev`.
- [ ] TypeScript check xanh cho mobile package.
- [ ] `docs/conventions/11-mobile-expo.md` tồn tại và được `AGENTS.md` trỏ tới.
- [ ] Màn hình đầu tiên có API base URL, connection status, conversation ID và Start/Stop Voice.
- [ ] App shell không thiết kế cụt: có seam để thêm drawer/menu + resource screens + auth sau này.
- [ ] Voice client có service/hook riêng, không nhồi toàn bộ logic vào screen component.
- [ ] API/WebSocket URL đi qua service helper, không nối path rải rác trong component.
- [ ] UI dùng token/style nhất quán với `docs/conventions/09-ui-visual-design.md`.
- [ ] Roadmap trỏ tới spec này cho dòng mobile/ambient companion.
