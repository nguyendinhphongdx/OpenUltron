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

Dashboard: http://localhost:9119 (bật qua `HERMES_DASHBOARD=1` trong `docker-compose.yml`) — theo
docs chính thức, dashboard **bắt buộc auth** nếu bind ra ngoài `127.0.0.1`; deploy local thì mặc
định đủ dùng, deploy có expose ra ngoài LAN/Internet cần cấu hình thêm 1 trong các provider auth
(`HERMES_DASHBOARD_BASIC_AUTH_*`/OAuth/OIDC — xem
[docs Docker chính thức](https://hermes-agent.nousresearch.com/docs/user-guide/docker)).

Gateway API (OpenAI-compatible): http://localhost:8642 — chỉ cần nếu muốn gọi vào từ tool khác,
không bắt buộc cho việc chỉ dùng qua kênh chat (Telegram/Discord/...).

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
