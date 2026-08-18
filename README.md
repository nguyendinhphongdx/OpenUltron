# Ultron

Personal AI agent platform — API + web + mobile + desktop, chạy trên nền [OpenJarvis](../OpenJarvis) làm agent-engine (local-first).

Xem [AGENTS.md](AGENTS.md) cho convention đầy đủ, [docs/adr/](docs/adr/) cho quyết định kiến trúc, [docs/roadmap/](docs/roadmap/) cho tiến độ.

## Quick start

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm --filter @ultron/api prisma:migrate
pnpm --filter @ultron/api start:dev
```

API chạy ở `http://localhost:3100/api`, Swagger docs ở `/docs`.
