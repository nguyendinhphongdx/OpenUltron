# Feature: Redesign UI Knowledge Base (`apps/web`)

Status: implemented

> Research kèm theo: [`docs/research/knowledge-base-ui-redesign.md`](../research/knowledge-base-ui-redesign.md)
> (so sánh với Dify: dataset list / dataset detail layout / document list / chunk view).

## Vấn đề / động lực

UI Knowledge Base ở `apps/web` hiện chỉ có 2 trang và cả 2 đều là **debug form**, không phải UX thật
(đã kiểm tra trực tiếp qua browser):

- `/knowledge-bases` — card phẳng liệt kê tên/slug/`embedding_model_id`, nút "Xoá" gọi
  `window.confirm`. Không có view toggle, không tìm kiếm, không lọc, không sắp xếp, không phân trang.
- `/knowledge-bases/[id]` — 1 form dọc dài gộp chung 4 việc không liên quan nhau: (1) sửa
  tên/mô tả/embedding model, (2) cây Folder/File (`FolderTree.tsx` — icon thư mục generic, nút
  `+ Folder`/`+ File` phẳng nằm giữa cây, ô input "Nội dung chunk…" nhét cạnh mỗi file), (3) mục
  "Thêm chunk trực tiếp vào KB" là tính năng legacy nhưng copy lộ nguyên văn note dev
  ("tương thích ngược…"), (4) ô tìm kiếm ngữ nghĩa ở cuối trang. Không phân vùng, không hierarchy.

Hệ quả: backend KB v2 đã có nested folder + per-file chunking status
(`KnowledgeFolder`/`KnowledgeFile`, roadmap đánh dấu "✅ Đã có (backend)") nhưng người dùng **không
dùng được** qua UI. Roadmap cũng đang treo mục `apps/web — KB folder tree UI`.

Ngoài ra `docs/conventions/09-ui-visual-design.md` yêu cầu các màn `KnowledgeBase` phải là workspace
surface ("tránh form dài một cột trông như CRUD scaffold") — bản hiện tại vi phạm trực tiếp.

## Mục tiêu (Goals)

Bám đúng 5 yêu cầu user đã chốt, không mở rộng:

1. **Nhiều trang**, không còn 1 trang debug-form gộp tất cả.
2. **Trang đầu = danh sách KB đạt chuẩn enterprise**:
   - **toggle list ⇄ grid view**;
   - **tìm kiếm** theo tên/slug/mô tả;
   - **bộ lọc**;
   - **sắp xếp**;
   - empty state phân biệt "chưa có KB nào" vs "filter/search không ra kết quả";
   - loading dạng skeleton giữ chỗ, xoá có confirm dialog (shadcn `AlertDialog`) thay `window.confirm`.
3. **Trang chi tiết 1 KB**:
   - phần **metric tổng quan** (số liệu: tổng số file, tổng số chunk, dung lượng, trạng thái xử
     lý — xem "Chưa quyết" về nguồn dữ liệu cho từng số);
   - bên dưới là **UI kiểu Google Drive**: 1 danh sách mà mỗi item là **file hoặc folder**;
     **folder click toggle mở/đóng để hiện children ngay tại chỗ** (không điều hướng sang trang
     khác), nâng cấp UX so với `FolderTree.tsx` hiện tại (hàng có cột rõ ràng, cột trạng thái
     chunking là cột hạng nhất, `role="tree"`/`aria-expanded`/keyboard nav, indent theo depth).
4. **Xem chi tiết 1 file → thấy danh sách chunk đã phân tích của file đó** (nội dung chunk, và
   trạng thái/metadata nếu backend trả về).
5. **Thiết kế lấy Dify làm tham khảo** (đã research — xem file research kèm theo), đồng thời tuân
   `docs/conventions/02-frontend-nextjs.md` + `09-ui-visual-design.md` (Soft Glass Workspace
   Console: light-first, low-contrast, border nhạt, không card-trong-card).

Goal kỹ thuật kèm theo (không thêm phạm vi sản phẩm):

6. Dọn vi phạm convention của feature này khi đụng tới: logic/hook không nằm trong `app/`
   (mỗi `page.tsx` chỉ đọc `params` + render 1 View), component đặt đúng
   `features/knowledge-base/components/` với suffix `View` cho route-level, extract
   `PageShell`/`ConfirmDialog` dùng chung nếu đủ điều kiện theo `02-frontend-nextjs.md`.
7. Bỏ text lộ note dev ("tương thích ngược…") khỏi UI.

## Ngoài phạm vi (Non-goals)

- ❌ **Upload file thật** (drag-drop, chọn file từ máy, progress bar, real-time upload progress) —
  backend `FileCreate` chỉ nhận `name`/`folder_id`, chưa nhận binary.
- ❌ **Job queue / task drawer / theo dõi chunking real-time (WebSocket/SSE/polling)** — chunking
  hiện chạy đồng bộ trong 1 request `POST .../files/{id}/chunks`.
- ❌ **Phân quyền / RBAC / multi-tenant / workspace / share** — Ultron là công cụ 1 người dùng
  ([AGENTS.md rule 6](../../AGENTS.md)).
- ❌ **Tag / tag filter / tag management** cho KB — chưa có entity tag ở backend.
- ❌ **Rename / move (drag-to-move) folder & file** — backend chưa có `PATCH` folder/file, `folder_id`
  không sửa được sau khi tạo.
- ❌ **Sửa/xoá/bật-tắt từng chunk, reindex, revision/version của file, hit_count, keywords,
  parent-child chunking** — không có field/endpoint tương ứng.
- ❌ **Đổi `embedding_model_id` sau khi tạo KB** — `KnowledgeBaseUpdate` chỉ có `name`/`description`
  (đúng nghiệp vụ: đổi model = đổi dimension vector đã lưu). Chỉ hiển thị read-only.
- ❌ **Thay đổi mô hình dữ liệu / thêm bảng / thêm migration** — spec này là redesign UI.
- ❌ **Đổi `apps/api` vượt mức "thêm endpoint đọc cho đúng dữ liệu UI cần"** — và ngay cả phần đó
  cũng chưa được chốt trong spec này (xem "Chưa quyết").
- ❌ Thêm state-management library mới, thêm Server Component / `app/api/*` chứa backend logic.

## Thiết kế

### Trang / route

| Route | Trạng thái | Nội dung |
|---|---|---|
| `/knowledge-bases` | **redesign** | Danh sách KB. Toolbar: search + filter + sort + toggle list/grid + nút "Tạo KB". Grid = card (tên, mô tả 2 dòng, embedding model, metric ngắn, updated); List = table workspace (cột Tên/Slug/Embedding model/Metric/Updated/`⋯`). Empty state 2 loại. Skeleton khi loading |
| `/knowledge-bases/new` | giữ route, làm lại UI | Form tạo KB (slug, tên, mô tả, embedding model) — theo visual convention, không phải form trần |
| `/knowledge-bases/[id]` | **redesign** | Vùng metric tổng quan + danh sách kiểu Google Drive (folder/file, folder toggle mở/đóng in-place). Toolbar riêng: lọc theo trạng thái + tìm theo tên + nút "Tạo folder"/"Tạo file" |
| `/knowledge-bases/[id]/files/[fileId]` | **mới** | Chi tiết 1 file: header (tên file, breadcrumb đường dẫn folder, trạng thái + `error_message` nếu có) + **danh sách chunk đã phân tích** (master–detail: list chunk bên trái → nội dung đầy đủ bên phải; mỗi chunk hiện số thứ tự, độ dài nội dung, `metadata` nếu có) + form thêm chunk cho file này |
| `/knowledge-bases/[id]/settings` | **mới** | Sửa tên/mô tả; embedding model + slug read-only; xoá KB (confirm dialog). Tách khỏi trang chi tiết để không còn "form dọc gộp chung" |
| `/knowledge-bases/[id]/search` | **mới** | Tìm kiếm ngữ nghĩa trong KB (`POST /{kb_id}/search`) — tách khỏi cuối trang chi tiết; hiện chunk + `score` |

`[id]` dùng **layout chung** (`app/knowledge-bases/[id]/layout.tsx`) cấp header KB + nav sang
Files/Search/Settings — mượn pattern `knowledge-space-shell.tsx` của Dify nhưng cắt còn 3 mục.
Số mục nav / có nên là sidebar hay tab ngang: xem "Câu hỏi mở".

### Code structure (`02-frontend-nextjs.md`)

- `app/knowledge-bases/**/page.tsx` chỉ parse `params` + render 1 View. Không hook/handler ở `app/`.
- `features/knowledge-base/` giữ layering `types → services → hooks → components`; View mới:
  `KnowledgeBaseListView`, `KnowledgeBaseDetailView`, `KnowledgeFileDetailView`,
  `KnowledgeBaseSettingsView`, `KnowledgeSearchView`. Presentational: `KnowledgeBaseCard`,
  `KnowledgeBaseRow`, `DriveList` + `DriveRow`, `FileStatusBadge`, `ChunkList`, `ChunkDetail`,
  `KnowledgeMetrics`.
- Map `FileStatus → icon + màu + label` để **1 chỗ duy nhất** (hiện `STATUS_LABEL`/`STATUS_STYLE`
  nằm trong `FolderTree.tsx`) — dùng lại ở drive list, file detail, filter.
- Path mới khai ở `src/lib/api/endpoints.ts`, không hardcode URL trong service.
- Component dùng ≥ 2 feature (`ConfirmDialog`, `PageShell`, `EmptyState`) → `src/components/shared/`.

### Dữ liệu thật đang có (không đoán — theo `apps/api/app/modules/knowledge_base/schemas.py`)

- `KnowledgeBaseRead`: `id, slug, name, description, embedding_model_id, created_at, updated_at`
- `FolderRead`: `id, kb_id, parent_folder_id, name, created_at, updated_at`
- `FileRead`: `id, kb_id, folder_id, name, status (pending|chunking|done|error), error_message,
  created_at, updated_at`
- `ChunkRead`: `id, kb_id, file_id, content, metadata, created_at`
- `SearchResult`: `chunk` + `score` (cosine distance — càng nhỏ càng giống)
- Endpoint đang có: KB list/create/get/patch/delete · folder create/list(1 cấp)/delete ·
  file create/list(1 cấp)/delete · `POST /{kb}/chunks` · `POST /{kb}/files/{id}/chunks` ·
  `POST /{kb}/search`.

⇒ Filter/sort/search trang danh sách và metric "số file/chunk" **không có sẵn** trong dữ liệu này.

### Endpoint gap đã chốt trong implementation hiện tại

Ba gap dưới đây từng chặn Goal 3 và Goal 4; implementation hiện tại đã xử lý ở mức tối thiểu, không thêm bảng/migration:

1. **Xem chunk của 1 file (Goal 4) — chặn cứng.** Backend **không có endpoint GET chunk nào**
   (chỉ POST). Cần thêm `GET /knowledge-bases/{kb_id}/files/{file_id}/chunks` (kèm quyết định có
   phân trang / có trả `content` đầy đủ hay cắt bớt không). ⇒ Đã thêm endpoint `GET /knowledge-bases/{kb_id}/files/{file_id}/chunks`.
2. **Metric tổng quan (Goal 3).** `KnowledgeBaseRead` không có count nào; `GET /folders`/`GET /files`
   chỉ lọc **1 cấp** ⇒ đếm tổng file/chunk bằng FE = duyệt đệ quy cả cây (N+1 request), không khả
   thi. Riêng **"dung lượng"** thì schema **không có field byte size** nào cả — đại lượng gần nhất là
   tổng `len(chunk.content)`. ⇒ Đã thêm endpoint `GET /knowledge-bases/{id}/stats`; "dung lượng" tạm định nghĩa là `total_content_chars`.
3. **Filter/search/sort trang danh sách (Goal 2).** `GET /knowledge-bases` không nhận query param
   nào. Hai hướng: (a) làm **client-side** trên toàn bộ list — hợp quy mô 1 người dùng, không sửa
   backend; (b) thêm query param `keyword`/`sort`/`limit`/`offset` ở backend. Đã chọn hướng (a): client-side search/sort/filter trên toàn bộ list, phù hợp quy mô 1 người dùng.

Ngoài ra: **virtualize** danh sách chunk/drive-list khi nhiều row sẽ cần dependency mới
(`@tanstack/react-virtual` như Dify) → chỉ thêm khi có nhu cầu thật, **chưa quyết**.

## Câu hỏi mở

1. **Chunk legacy `file_id = NULL`** (tạo qua `POST /{kb_id}/chunks` trước khi có Folder/File) — UI
   mới xử lý sao? (a) ẩn hẳn khỏi UI và bỏ luôn form "Thêm chunk trực tiếp", (b) hiện thành 1 mục
   "Chunk rời (không thuộc file)" read-only ở trang chi tiết KB, (c) giữ nguyên cả form tạo. Yêu cầu
   của user không đề cập.
2. **"Bộ lọc" ở trang danh sách KB lọc theo tiêu chí nào?** Dữ liệu hiện có chỉ cho phép lọc theo
   **embedding model** (và theo "có mô tả / không"). Lọc theo "số file" hay "trạng thái xử lý" thì
   phụ thuộc metric ở mục "Chưa quyết" #2. Sort thì có sẵn: tên, `created_at`, `updated_at`.
3. **Nav trang chi tiết KB**: sidebar trái kiểu Dify `knowledge-space-shell`, hay tab ngang dưới
   header? (3 mục Files/Search/Settings — sidebar có thể hơi nặng.)
4. **Xem chunk**: master–detail 2 cột (như `document-chunk-tree.tsx` bản mới của Dify) hay danh sách
   card dọc (như `segment-card` legacy)? Spec đang đề xuất master–detail.
5. **Metric hiển thị chính xác những số nào**, và có cần cả ở card trang danh sách hay chỉ ở trang
   chi tiết? (Ảnh hưởng trực tiếp tới việc endpoint mới trả gì — mục "Chưa quyết" #2.)

## Acceptance criteria

Các mục endpoint chặn chính đã được chốt trong implementation hiện tại (`GET /stats`, `GET /files/search`, `GET /files/{fileId}/chunks`).

**Trang danh sách `/knowledge-bases`**

- [ ] Có toggle list ⇄ grid; lựa chọn của user được giữ khi ở lại trang (state cục bộ, không cần persist)
- [ ] Ô tìm kiếm lọc theo tên/slug/mô tả, không reload trang
- [ ] Có sắp xếp (tối thiểu: tên, mới cập nhật) và bộ lọc (tiêu chí chốt ở Câu hỏi mở #2)
- [ ] Empty state khác nhau cho "chưa có KB nào" và "search/filter không ra kết quả"
- [ ] Loading dùng skeleton giữ chỗ, không gây layout jump
- [ ] Xoá KB đi qua confirm dialog shadcn (`AlertDialog`), không dùng `window.confirm`
- [ ] Không còn card phẳng lộ `embedding_model_id` dạng số — hiện tên model (từ `GET /models`)

**Trang chi tiết `/knowledge-bases/[id]`**

- [ ] Có vùng metric tổng quan hiển thị đúng số liệu (không hardcode, không tính sai bằng cách đếm
      thiếu cây con)
- [ ] Danh sách 1 cấp phẳng-hợp-nhất: mỗi item là file **hoặc** folder, phân biệt bằng icon + hàng
      có cột (tên / trạng thái / cập nhật / action)
- [ ] Click folder → toggle mở/đóng hiện children **ngay tại chỗ**, không điều hướng sang trang khác;
      đóng lại được; nhiều folder mở cùng lúc được
- [ ] Cây có `role="tree"`/`role="treeitem"`, `aria-expanded`, indent theo depth; điều hướng được
      bằng bàn phím (Arrow lên/xuống/phải/trái, Enter)
- [ ] Trạng thái chunking của file (`pending|chunking|done|error`) hiển thị rõ như 1 cột, `error` kèm
      `error_message`
- [ ] Không còn form sửa KB, không còn "Thêm chunk trực tiếp", không còn ô search ngữ nghĩa trong
      trang này (đã tách sang `/settings` và `/search`)
- [ ] Không còn text note dev lộ ra UI

**Trang chi tiết file `/knowledge-bases/[id]/files/[fileId]`**

- [ ] Hiện danh sách chunk đã phân tích của đúng file đó, mỗi chunk có số thứ tự + nội dung + độ dài;
      `metadata` hiện khi có
- [ ] Chọn 1 chunk → xem được toàn bộ nội dung (không bị cắt)
- [ ] File chưa chunk (`pending`) / lỗi (`error`) có empty/error state riêng, `error` hiện
      `error_message`
- [ ] Breadcrumb quay được về KB (và về danh sách KB)

**Chung**

- [ ] Mọi `app/knowledge-bases/**/page.tsx` chỉ parse `params` + render 1 View — không hook/handler
      trong `app/`
- [ ] Feature layering `types → services → hooks → components` đúng, có barrel `index.ts`; type khớp
      `apps/api/app/modules/knowledge_base/schemas.py`
- [ ] Primitive UI mới đều là shadcn (generate qua `pnpm dlx shadcn@latest add`), không tự viết tay
- [ ] Không hardcode URL — path khai ở `src/lib/api/endpoints.ts`
- [ ] Đạt checklist "Self-check trước khi xong" của
      [`02-frontend-nextjs.md`](../conventions/02-frontend-nextjs.md) và
      [`09-ui-visual-design.md`](../conventions/09-ui-visual-design.md) (responsive 375/768/1024/1440)
- [ ] `pnpm --filter @ultron/web lint && typecheck && build` xanh
- [ ] Không thêm phạm vi ở mục Non-goals (đặc biệt: không upload file, không RBAC, không real-time
      progress, không rename/move)
