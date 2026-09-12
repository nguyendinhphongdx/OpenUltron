# Hermes Agent (Nous Research) — dựng để trải nghiệm/so sánh, KHÔNG phải dependency của Ultron

Đây là setup Docker cho [Hermes Agent](https://github.com/NousResearch/hermes-agent), 1 personal
AI agent tự host khác (persistent memory, auto-skill-creation, đa kênh nhắn tin, cron scheduler) —
dựng ở đây để chạy thật, dùng thử, so sánh kiến trúc/UX với Ultron. Không import code, không gọi
API của nó từ `apps/api`/`apps/web` — hoàn toàn độc lập, tách biệt (cùng tinh thần
[ADR-0001](../../docs/adr/0001-single-python-runtime.md) áp dụng cho OpenJarvis: tham khảo, không
phụ thuộc runtime).

Dùng **image chính thức** `nousresearch/hermes-agent` (không tự build lại từ Dockerfile — repo gốc
build multi-stage khá phức tạp: tự compile SQLite, Node 26, Playwright, s6-overlay... tự build lại
sẽ trùng lặp công sức, khó bảo trì và dễ lệch khi họ update).

## Chạy lần đầu (setup wizard — bắt buộc trước khi start)

```bash
cd tools/hermes-agent
mkdir -p data
docker run -it --rm -v "$(pwd)/data:/opt/data" nousresearch/hermes-agent setup
```

Wizard hỏi: LLM provider (Anthropic/OpenAI/DeepSeek/OpenRouter...) + API key, kênh nhắn tin muốn
kết nối (Telegram/Discord/Slack/WhatsApp...). Kết quả ghi vào `data/.env` + `data/config.yaml` —
**không commit `data/`** (đã gitignore ở thư mục này, chứa API key thật).

## Chạy lâu dài (gateway, sau khi đã setup)

```bash
docker compose up -d
docker compose logs -f
```

Dashboard: http://localhost:9119 — cần tạo file `tools/hermes-agent/.env` (gitignore, KHÔNG commit)
với 3 biến sau trước khi `docker compose up -d`, nếu không dashboard tự chặn (auth bắt buộc khi
bind `0.0.0.0`, không có tuỳ chọn public-không-auth):

```bash
# tools/hermes-agent/.env
HERMES_DASHBOARD_BASIC_AUTH_USERNAME=admin
HERMES_DASHBOARD_BASIC_AUTH_PASSWORD=<mật khẩu tự chọn>
API_SERVER_KEY=<openssl rand -hex 32>
```

Gateway API (OpenAI-compatible): http://localhost:8642 — bật qua `API_SERVER_ENABLED=true` (đã có
sẵn trong `docker-compose.yml`), chỉ cần nếu muốn gọi vào từ tool khác/health-check; không bắt
buộc cho việc chỉ dùng qua kênh chat (Telegram/Discord/...).

## Source code (để custom) — `src/`

`src/` là **git clone thật** của [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)
(MIT license) — repo Git riêng, **KHÔNG commit vào Ultron** (gitignore ở thư mục này), tự `git pull`
trong đó để cập nhật. Dùng khi cần sửa code Hermes trực tiếp (build image tuỳ chỉnh từ `src/Dockerfile`
thay vì kéo `nousresearch/hermes-agent:latest`) — với việc chỉ cấu hình/dùng thử qua plugin thì không
cần đụng tới `src/`, chỉ cần image chính thức ở trên là đủ.

## Dừng / xoá

```bash
docker compose down          # dừng, giữ nguyên data/
rm -rf data/                 # xoá sạch state (tự làm nếu muốn setup lại từ đầu)
```

## Ghi chú

- `data/` là **nguồn sự thật duy nhất** — image không giữ state gì, update bằng `docker compose
  pull && docker compose up -d` không mất cấu hình.
- File `.env` mà Hermes tự tạo nằm TRONG `data/.env` (bên trong volume) — khác `.env` gitignore
  chung của repo Ultron ở root, không liên quan tới nhau.
