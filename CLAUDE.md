# anlaa-tools-next â€” Claude Code Context

## Dá»± Ã¡n lÃ  gÃ¬

Rewrite hoÃ n toÃ n MECALC tá»« HTML thuáº§n + Express + SQLite sang Next.js 15 + TypeScript + PostgreSQL + Prisma.

**Project cÅ©**: `g:\.AIWork\.anlaa-tools` â€” Ä‘ang cháº¡y production táº¡i `tool.kientrucanl.vn`
**Project nÃ y**: `g:\.AIWork\.anlaa-tools-next` â€” báº£n Next.js má»›i, phÃ¡t triá»ƒn song song

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 App Router |
| Language | TypeScript strict |
| Styling | Tailwind CSS v4 + CSS variables (glassmorphism) |
| DB ORM | Prisma + PostgreSQL |
| Auth | Custom JWT (bcryptjs + jsonwebtoken) |
| Realtime | Socket.io (server riÃªng táº¡i `server/`) |
| State | Zustand + TanStack React Query |
| Validation | Zod |
| Spreadsheet | @univerjs/presets |

## Migration plan

Xem chi tiáº¿t táº¡i `g:\.AIWork\.anlaa-tools\MIGRATION-NEXTJS.md`

### Phase status
- [x] Phase 1 â€” Foundation (scaffold, Prisma schema, auth, globals.css, types)
- [x] Phase 2 â€” API Routes (projects, users, notifications, prices, collab, quotations, contractors, estimate-templates)
- [x] Phase 3 â€” Calculator & Constants (port pure functions sang TypeScript)
- [x] Phase 4 â€” Pages & Components (layout, sidebar, dashboard, 8 pages)
- [x] Phase 5 â€” Estimate Page + Univer
- [x] Phase 6 â€” Socket.io Server (socket-server.ts + Prisma)
- [x] Phase 7 â€” Data Migration (SQLite â†’ PostgreSQL seed script)
- [x] Phase 8 â€” Deployment (Docker Compose)

## Quy táº¯c quan trá»ng

- UI 100% Tiáº¿ng Viá»‡t, code 100% Tiáº¿ng Anh
- CSS variables giá»¯ nguyÃªn tÃªn nhÆ° codebase cÅ© (`--bg-main`, `--text-primary`, etc.)
- JWT lÆ°u trong httpOnly cookie `anlaa_token` â€” middleware Ä‘á»c Ä‘Æ°á»£c
- `getRequestUser(req)` Ä‘á»ƒ láº¥y user tá»« header `x-user-id` / `x-user-role` do middleware set
- Má»i input validate qua Zod trÆ°á»›c khi xá»­ lÃ½
- Gáº¡ch miá»n Báº¯c: 6.5Ã—10.5Ã—22 cm, TÆ°á»ng 110 = 60 viÃªn/mÂ², TÆ°á»ng 220 = 120 viÃªn/mÂ²
- LÃ m trÃ²n lÃªn `Math.ceil` cho sá»‘ bao váº­t liá»‡u

## Khá»Ÿi Ä‘á»™ng dev

```bash
# 1. Táº¡o PostgreSQL database
# 2. Copy .env.local.example â†’ .env.local vÃ  Ä‘iá»n giÃ¡ trá»‹
cp .env.local.example .env.local

# 3. CÃ i dependencies
npm install

# 4. Táº¡o Prisma client + migrate DB
npx prisma generate
npx prisma migrate dev --name init

# 5. Start dev server
npm run dev
# App táº¡i http://localhost:3000
```

## Cáº¥u trÃºc thÆ° má»¥c chÃ­nh

```
src/
  app/
    (auth)/login/         â† Login page (public)
    api/auth/             â† Login, logout, me, password
    api/projects/         â† CRUD + approval (Phase 2)
    estimate/             â† Estimate + Univer (Phase 5)
    materials/            â† Calculator UI (Phase 4)
    ...
  lib/
    auth/                 â† jwt.ts, session.ts, middleware.ts
    db/prisma.ts          â† PrismaClient singleton
    types/                â† models.ts, api.ts, socket.ts
    calculations/         â† Pure functions (Phase 3)
    constants/            â† BRICK_PROPERTIES etc. (Phase 3)
  styles/globals.css      â† CSS variables + base styles
server/
  socket-server.ts        â† Socket.io standalone (Phase 6)
prisma/
  schema.prisma           â† Database schema Ä‘áº§y Ä‘á»§
```





