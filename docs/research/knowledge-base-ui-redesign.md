# Research: UI Knowledge Base — tham khảo Dify

Liên quan spec: `docs/features/knowledge-base-ui-redesign.md`

## Câu hỏi nghiên cứu

UI Knowledge Base hiện tại của Ultron (`/knowledge-bases`, `/knowledge-bases/[id]`) là 2 "debug
form" — card phẳng + 1 form dọc gộp mọi thứ. Cần trả lời trước khi chốt Goals/Non-goals:

1. Một sản phẩm RAG trưởng thành tổ chức **trang danh sách KB** thế nào (view mode, filter, search,
   sort, metric trên card)?
2. Tổ chức **trang chi tiết 1 KB** thế nào — 1 trang dài hay tách sub-route/tab?
3. **Danh sách file/document trong 1 KB** trình bày thế nào (đặc biệt cột trạng thái xử lý)?
4. **Xem chunk của 1 file** trình bày thế nào — modal, trang riêng, hay master–detail?
5. Cái gì **không** áp dụng được vì Ultron khác mô hình dữ liệu (nested folder) hoặc khác rule sản
   phẩm (1 người dùng, [AGENTS.md rule 6](../../AGENTS.md))?

## Sản phẩm/tài liệu tham khảo

Dify (bản clone local, chỉ đọc — đường dẫn dùng cho traceability, không copy code vào Ultron):

- **Dataset list (legacy)** — `web/app/components/datasets/list/{index,header,datasets}.tsx`,
  `web/app/components/datasets/list/dataset-card/components/dataset-card-footer.tsx`
- **Dataset list (bản mới "knowledge-fs")** — `web/features/new-rag/new-knowledge-list.tsx`,
  `web/features/new-rag/components/knowledge-space-card.tsx`,
  `web/features/new-rag/components/knowledge-view-switcher.tsx`
- **Layout trang chi tiết dataset** —
  `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/layout-main.tsx` (legacy, tab
  Documents/Hit Testing/Settings/API qua sub-route),
  `web/features/new-rag/knowledge-space-shell.tsx` (bản mới: sidebar trái Overview/Sources/
  Documents/Hit Testing/Quality/Settings/API + `<section>` phải render children)
- **Danh sách document trong 1 dataset** — `web/features/new-rag/document-list.tsx`,
  `web/features/new-rag/documents-page.tsx`, `web/app/components/datasets/documents/index.tsx`
- **Xem chunk/segment của 1 document** — `web/features/new-rag/document-detail-page.tsx`,
  `web/features/new-rag/document-chunk-tree.tsx`, `web/features/new-rag/document-chunk-detail.tsx`,
  `web/app/components/datasets/documents/detail/completed/segment-card/index.tsx`

## So sánh

| Vấn đề | Dify làm gì | Ưu | Nhược / không hợp Ultron |
|---|---|---|---|
| Trang danh sách KB | Grid responsive `grid-cols-[repeat(auto-fill,minmax(296px,1fr))]`, card cố định cao ~166px: icon + tên + mô tả 2 dòng (`line-clamp-2`) + chip tag + footer metric. Header sticky: `h1` + tag filter + search input (debounce 500ms) + checkbox "all knowledge" + dropdown "Create". Phân trang bằng infinite scroll (`IntersectionObserver` + `fetchNextPage`), có skeleton card | Card kể được câu chuyện (bao nhiêu document, bao nhiêu app đang dùng, updated khi nào) thay vì chỉ id/slug | Dify **chỉ có grid, không có list/grid toggle** cho dataset (toggle `KnowledgeViewSwitcher` là switch giữa 2 *phiên bản* knowledge legacy/new, KHÔNG phải grid↔list). Yêu cầu list/grid của Ultron không có mẫu 1-1 → lấy pattern table workspace ở `document-list.tsx` cho chế độ list. Tag filter cũng không áp dụng: Ultron chưa có entity tag |
| Metric trên card KB | `dataset-card-footer.tsx`: icon file + `total_available_documents / document_count` (dạng `3 / 5` khi có doc bị disable) + icon robot + `app_count` + "Updated <relative time>", cả footer `opacity-30` khi `embedding_available === false` | Metric ngắn, ở footer, có tooltip giải thích số; trạng thái "KB không dùng được" thể hiện bằng độ mờ toàn card thay vì badge ồn ào | Số này Dify lấy **sẵn từ API list** (`document_count`, `app_count`, `total_available_documents` nằm trong response). `KnowledgeBaseRead` của Ultron KHÔNG có bất kỳ count nào → xem "Chưa quyết" |
| Trang chi tiết KB | Không phải 1 trang. Là **layout + sub-route**: `[datasetId]/documents`, `/hitTesting`, `/settings`, `/api`, `/access-config`. Bản mới dùng sidebar trái 240px (nav item cao 32px, `aria-current="page"`) + panel phải cuộn độc lập; header sidebar có breadcrumb về list + tên KB + dòng metadata `chunking mode · indexing · retrieval` | Mỗi màn 1 việc; settings không chen vào danh sách file; deep-link được từng tab; redirect mặc định vào tab hợp lý (`getDatasetRedirectionPath`) | Sidebar 7 nav item là quá nhiều cho Ultron (Sources/Quality/API/Access-config không có backend tương ứng). Ultron chỉ cần Files + Search + Settings |
| Danh sách file/document | `document-list.tsx`: **table** `table-fixed`, cột checkbox / Document (icon + link + badge `v{revision}`) / Source / Status / Updated / `⋯` menu. Toolbar trên table: `<select>` filter theo status + search input + nút Tasks + nút "Add document". Cột trạng thái = icon + text theo map `statusIconClass` (`ready` ✓ success, `queued` ⏱ tertiary, `processing` spinner accent có `motion-reduce:animate-none`, `failed` ⚠ destructive, `disabled` ⊝). Row `disabled` để `opacity-60`. Load thêm theo batch 100 + nút "Load more" có quản lý focus | Trạng thái chunking đọc được trong 1 nhịp mắt; cột ẩn dần theo breakpoint (`hidden lg:table-cell`) thay vì tràn ngang; a11y tốt (`aria-busy`, `role="status"`, `sr-only` cho loading) | Dify là **danh sách phẳng** — không có folder. Đây là chỗ khác biệt cốt lõi với Ultron (xem mục dưới). Các cột Source/revision/enable-disable/bulk-reindex không có tương ứng ở Ultron |
| Xem chunk của 1 file | 2 kiểu cùng tồn tại: (a) legacy `segment-card` — mỗi chunk là 1 card trong danh sách dọc, header card = `SegmentIndexTag` (số thứ tự) · số ký tự · số lần hit · badge "edited", body là nội dung, action edit/delete/toggle chỉ hiện khi hover; (b) bản mới `document-chunk-tree.tsx` — **master–detail**: `aside` bên trái là `role="tree"` các chunk (title = ordinal + đoạn đầu text), click chọn → panel phải hiện full nội dung. Tree có keyboard nav đầy đủ (Arrow/Home/End/Enter) và virtualize khi > 80 row (`@tanstack/react-virtual`) | Master–detail đọc chunk dài mà không mất ngữ cảnh vị trí; card list thì scan nhanh hơn. Cả 2 đều hiển thị **số thứ tự chunk + độ dài** — metadata quan trọng nhất của 1 chunk | Chunk của Dify có `position`, `word_count`, `hit_count`, `enabled`, child chunk (parent-child chunking). `KnowledgeChunk` Ultron chỉ có `id`, `content`, `metadata` (JSONB), `created_at` → UI chunk của Ultron phải nghèo hơn, không bịa `hit_count`/`enabled` |
| Empty state | `DocumentsEmpty`: icon trong ô bo tròn + `h2` ngắn + 1 dòng mô tả + 1 nút primary + hint drag-drop; list KB rỗng lần đầu khác với "rỗng do filter" (`FilterEmptyState`) | Phân biệt "chưa có gì" vs "filter không ra kết quả" — người dùng không tưởng là mất dữ liệu | Không áp dụng phần drag-drop upload (Ultron `POST /files` chỉ nhận `name`, chưa có upload binary) |

## Insight áp dụng cho Ultron

1. **Tách trang chi tiết thành sub-route, không nhồi 1 trang.** Dify không có "trang chi tiết
   dataset" — có layout + `documents`/`hitTesting`/`settings`. Ultron áp dụng trực tiếp: form sửa
   tên/mô tả và ô search ngữ nghĩa không được nằm chung dòng chảy với danh sách file như hiện tại.
   Khớp luôn rule `02-frontend-nextjs.md` ("tránh form dài một cột trông như CRUD scaffold").
2. **Trạng thái xử lý là cột hạng nhất, không phải chú thích.** Map `status → icon + màu + label`
   một chỗ duy nhất (Dify: `statusIconClass`). Ultron đã có `FileStatus` 4 giá trị
   `pending|chunking|done|error` + `error_message` — đủ để làm cột status đúng nghĩa (hiện
   `FolderTree.tsx` đã có `STATUS_LABEL`/`STATUS_STYLE` nhưng nhét vào 1 dòng chật chội cạnh input
   thêm chunk).
3. **Metric để ở footer/summary, dạng icon + số, có tooltip giải thích** — không dựng dashboard
   card KPI to. Đúng cả với `09-ui-visual-design.md` (không card trong card, không hero).
4. **Xem chunk = master–detail** (list chunk bên trái, nội dung đầy đủ bên phải) tốt hơn accordion
   hoặc modal, vì chunk là text dài và người dùng cần so sánh chunk kề nhau. Mỗi chunk hiện **số thứ
   tự + độ dài nội dung** làm nhãn (2 thứ này Ultron tính được client-side từ `content.length` và
   index — không cần backend).
5. **Phân biệt 3 loại empty state**: chưa có KB nào · KB rỗng chưa có file · filter/search không ra
   kết quả. Đây là chi tiết làm UI "đủ tiêu chuẩn enterprise" mà bản hiện tại thiếu hoàn toàn.
6. **Toolbar đứng riêng trên vùng dữ liệu** (filter + search + action bên phải), sticky khi cuộn —
   thay vì rải nút `+ Folder`/`+ File` phẳng ở giữa cây như hiện tại.
7. **Xoá phải có confirm dialog** — Dify dùng `AlertDialog` cho xoá segment. Ultron hiện dùng
   `window.confirm` (`FolderTree.tsx`, `KnowledgeBaseList`) → thay bằng shadcn `AlertDialog`
   (`02-frontend-nextjs.md` gợi ý `components/shared/ConfirmDialog`).
8. **A11y cho cây/tree không tự viết tay hời hợt**: Dify đặt `role="tree"`/`role="treeitem"`,
   `aria-expanded`, `aria-level`, `aria-posinset`, `aria-setsize`, keyboard Arrow/Home/End/Enter.
   `FolderTree.tsx` hiện tại là `<div>`/`<button>` thuần, không có role nào → đây là chuẩn cần đạt
   khi nâng cấp Google-Drive list.
9. **Giữ chỗ khi loading** (skeleton card, `animate-pulse` cho ô cell) thay vì text "Đang tải…" gây
   layout jump — khớp `09-ui-visual-design.md` mục Motion.

## Không áp dụng / ngoài phạm vi

- **Nested folder không có mẫu 1-1 trong Dify.** Dataset của Dify phẳng: document nằm trực tiếp
  trong dataset, không có folder, không có toggle mở/đóng. Bản mới nhất (`knowledge-fs`) có tên gợi
  ý filesystem nhưng UI vẫn là **table document phẳng** (`document-list.tsx`) — thứ có tree thực sự
  là *chunk tree trong 1 document* (`document-chunk-tree.tsx`, cây parent–child chunk), không phải
  cây folder. ⇒ Với yêu cầu "list Google Drive, item là file hoặc folder, folder toggle mở/đóng tại
  chỗ" của Ultron: chỉ mượn được **pattern kỹ thuật** của `document-chunk-tree.tsx` (role tree,
  `expanded` set giữ ở state cha, indent theo `depth`, keyboard nav, virtualize khi nhiều row) chứ
  không có màn Dify nào copy nguyên được. Layout hàng/cột thì mượn `document-list.tsx`.
- **Tag + tag filter + tag management modal** — Ultron chưa có entity tag cho KB. Không tự thêm.
- **RBAC / access-config / permission_keys / maintainer / "all knowledge" checkbox** — Dify là
  multi-tenant workspace. Ultron là công cụ 1 người dùng ([AGENTS.md rule 6](../../AGENTS.md)) →
  bỏ toàn bộ.
- **Upload file thật (drag-drop, progress, task queue, `processing-tasks-drawer.tsx`)** — backend
  Ultron chưa nhận binary (`FileCreate` chỉ có `name`, `folder_id`); chunking chạy **đồng bộ** trong
  1 request `POST .../files/{id}/chunks` (không có job queue — xem docstring `KnowledgeFile`). Không
  làm real-time progress/task drawer.
- **Revision/version của document, reindex, enable/disable chunk, hit_count, keywords, parent-child
  chunking, child chunk** — không có cột nào tương ứng trong `KnowledgeFile`/`KnowledgeChunk`.
- **External knowledge API / pipeline / service API panel** — ngoài phạm vi sản phẩm hiện tại.
- **Stack Dify không mang sang**: `jotai`, `nuqs`, `ahooks`, `foxact`, `react-i18next`, icon font
  `i-ri-*`. Ultron dùng react-query + `useState`, `lucide-react`, shadcn, không i18n
  (`02-frontend-nextjs.md`). `@tanstack/react-virtual` là dependency **mới** nếu muốn virtualize —
  chỉ thêm khi có nhu cầu thật, cần chốt riêng.

## Gap backend phát hiện khi đọc code (chặn yêu cầu, cần quyết định — KHÔNG tự quyết ở research)

Đọc `apps/api/app/modules/knowledge_base/{router,schemas,service}.py`:

1. **Không có endpoint GET chunk.** Chỉ có `POST /{kb_id}/chunks` và
   `POST /{kb_id}/files/{file_id}/chunks`. Không có `GET .../files/{file_id}/chunks`, không có
   `GET .../chunks`. ⇒ Yêu cầu "xem chi tiết 1 file → thấy danh sách chunk đã phân tích" **không
   thể làm bằng FE thuần**.
2. **Không có bất kỳ số liệu tổng hợp nào.** `KnowledgeBaseRead` = `id, slug, name, description,
   embedding_model_id, created_at, updated_at`. Không có `file_count`/`chunk_count`. `GET /folders`
   và `GET /files` đều lọc theo **1 cấp** `parent_folder_id`/`folder_id` ⇒ đếm tổng file trong KB
   bằng FE = duyệt đệ quy toàn bộ cây (N+1 request). Không khả thi.
3. **"Dung lượng" không tồn tại trong schema.** `KnowledgeFile` không có field byte size, không có
   `content` gốc. Đại lượng gần nhất là tổng `len(chunk.content)` — vẫn cần aggregate ở backend.
4. **Không có endpoint đổi tên (PATCH) folder/file, không có endpoint move** (`folder_id` không sửa
   được sau khi tạo). UI Google-Drive-like vì vậy chưa thể có rename/drag-to-move.
5. **`GET /knowledge-bases` không nhận query param nào** — không keyword/sort/limit/offset. Filter +
   search + sort của trang danh sách sẽ phải làm client-side trên toàn bộ list (hợp lý ở quy mô 1
   người dùng, nhưng là 1 quyết định cần chốt).
6. **`KnowledgeBaseUpdate` chỉ có `name` + `description`** — không đổi được `embedding_model_id`
   (đúng về nghiệp vụ: đổi model là đổi dimension của vector đã lưu). Form hiện tại đã disable ô này
   khi edit; UI mới nên hiển thị embedding model dạng **read-only** ở tab Settings, không phải input.
   Tên model phải lấy từ `GET /models` (response KB chỉ có id).
7. **Chunk "trực tiếp" (legacy, `file_id = NULL`)** vẫn tồn tại trong DB và vẫn có endpoint tạo. Số
   chunk này không thuộc file nào ⇒ UI mới phải quyết định làm gì với chúng (ẩn hẳn / hiện dạng mục
   "chunk rời"). Yêu cầu của user không nói tới → câu hỏi mở trong spec.
