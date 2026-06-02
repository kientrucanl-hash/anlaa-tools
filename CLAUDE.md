# MECALC — Claude Code Context

## Dự án là gì

Tool tính vật tư xây dựng miền Bắc (Hà Nội) cho kiến trúc sư / người dự toán. Ba module chính:
- **Xây & Trát** — Tính gạch, xi măng, cát, vữa cho tường gạch đỏ đặc và gạch rỗng 2 lỗ
- **Cán nền** — Tính vật tư cán nền xi măng cát
- **Ốp lát** — Tính gạch ốp/lát, keo dán, xi măng theo diện tích

Có hệ thống tài khoản user/admin + workflow phê duyệt dự án (draft → pending → approved/rejected).

## Stack

| Layer | Tech |
|-------|------|
| Frontend | HTML + CSS + Vanilla JS (không có build step, không framework) |
| Backend | Node.js + Express (`server/`) |
| Database | SQLite (`server/db/anlaa.db`) qua `better-sqlite3` |
| Auth | JWT (8h) + bcryptjs |
| Bảo mật | helmet, express-rate-limit, joi validation |

## Cấu trúc thư mục

```
├── index.html              — App chính (frontend)
├── admin.html              — Dashboard admin
├── css/styles.css          — Toàn bộ styles
├── js/
│   ├── app.js              — Main app logic + DOM (2382 lines)
│   ├── calculator.js       — Thuật toán tính vật tư
│   ├── constants.js        — Định mức, đơn giá mặc định
│   ├── api.js              — API client wrapper
│   ├── auth.js             — Auth + session handling
│   ├── admin.js            — Admin panel
│   ├── pdf-takeoff.js      — Đo từ file PDF
│   └── dxf-parser.js       — Parse file CAD (.dxf)
├── server/
│   ├── server.js           — Express app entry point
│   ├── logger.js           — Winston logger
│   ├── db/database.js      — SQLite DB layer (same API as trước)
│   ├── routes/auth.js      — POST /api/auth/login, GET /api/auth/me
│   ├── routes/projects.js  — CRUD + approval workflow (có joi validation)
│   └── middleware/auth.js  — requireAuth, requireAdmin
├── .agent/
│   ├── rules/              — Quy tắc nghiệp vụ và bảo mật
│   ├── skills/             — Skill sheets bóc khối lượng
│   ├── knowledge/          — Định mức vật tư TCVN
│   └── workflows/          — Workflow tính toán
├── Dockerfile + docker-compose.yml
└── README.md               — Hướng dẫn deploy
```

## Quy tắc nghiệp vụ quan trọng (KHÔNG được sai)

Đọc chi tiết tại `.agent/rules/rules_workspace.md`. Tóm tắt cứng:

- **Gạch miền Bắc**: 6.5 × 10.5 × 22 cm — không dùng kích thước miền Nam
- **Tường 110** (đơn) = 60 viên/m², **Tường 220** (đôi) = 120 viên/m²
- Kết quả số bao vật liệu luôn **làm tròn lên (Math.ceil)**
- Gói keo: **bao 25 kg**, xi măng PC40: **bao 50 kg**
- UI 100% Tiếng Việt, code 100% Tiếng Anh

## Quy tắc encoding HTML — BẮT BUỘC đọc trước khi sửa bất kỳ file HTML nào

Đọc `.agent/rules/rule_encoding_html.md`. Tóm tắt cứng:

- Tất cả file HTML phải là **UTF-8 không BOM** — kiểm tra trước khi edit
- Dấu hiệu lỗi: chữ `Ã¡`, `á»`, `Ä'` trong file → double-encoded, phải fix từ git history
- Trước deploy: chạy audit encoding toàn bộ `*.html` (script có trong rule)
- Không dùng Notepad, không dùng `Set-Content` thiếu `-Encoding utf8`, không dùng `utf-8-sig`

## Quy tắc bảo mật dự án

Đọc `.agent/rules/rule_bao_mat_du_an.md`. Tóm tắt cứng:

- `ACCOUNTS.local.md` — **KHÔNG xóa**, chỉ tham khảo nội bộ
- `server/.env` — **KHÔNG in giá trị** JWT_SECRET ra bất kỳ đâu
- `server/db/anlaa.db` — **KHÔNG commit**, đã có trong .gitignore
- Thêm endpoint mới → phải qua `requireAuth` hoặc `requireAdmin`
- Thêm input mới → phải qua joi schema

## Môi trường & Deploy

- **Production URL**: https://tool.kientrucanl.vn
- **VPS Server**: `ubuntu@51.79.250.113`
- **Reverse Proxy**: Nginx trên VPS (`/etc/nginx/sites-available/tool`) chuyển tiếp về `http://127.0.0.1:4000`
- **Docker Compose**: Ứng dụng chạy dưới dạng container `anlaa-tools-anlc-1` trên cổng `4000` của VPS
- **Quy trình Deploy**: Chạy script `./deploy-vps.ps1` để tự động nén mã nguồn, SCP lên VPS, giải nén và build lại Docker container.

## Khởi động nhanh


```bash
cd server
cp .env.example .env
# Điền JWT_SECRET (tạo bằng: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
npm start
# App chạy tại http://localhost:4000
# Health check: http://localhost:4000/health
```

## API chính

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/auth/login` | Không (rate limit 10/15m) |
| GET | `/api/auth/me` | Bearer token |
| GET/POST | `/api/projects` | User |
| PUT | `/api/projects/:id` | User (chỉ draft/rejected) |
| PUT | `/api/projects/:id/submit` | User |
| PUT | `/api/projects/:id/approve` | Admin |
| PUT | `/api/projects/:id/reject` | Admin |
| DELETE | `/api/projects/:id` | Admin |

## Logging

Winston log ra `logs/combined.log` và `logs/error.log` (tự rotate 5 MB × 5 file).

## Coding conventions

- Tên file & thư mục: `kebab-case`
- Biến & hàm: `camelCase`
- Hằng số định mức: `UPPER_SNAKE_CASE`
- Không comment giải thích WHAT — chỉ comment khi WHY không rõ ràng
- Không thêm abstraction khi chưa có ≥3 use case

## Compact Instructions

Khi compact context, **bắt buộc giữ lại**:

- Stack: Node.js + Express + SQLite (`better-sqlite3`) + Vanilla JS, không có build step
- Quy tắc gạch: 6.5×10.5×22 cm, Tường 110 = 60 viên/m², Tường 220 = 120 viên/m²
- Làm tròn lên `Math.ceil` cho số bao vật liệu; keo bao 25 kg, xi măng PC40 bao 50 kg
- Bảo mật: KHÔNG in JWT_SECRET, KHÔNG commit `.env` và `anlaa.db`, mọi endpoint mới cần `requireAuth`/`requireAdmin`
- Cấu trúc: frontend ở root (`index.html`, `js/`, `css/`), backend ở `server/`, DB ở `server/db/anlaa.db`
- UI 100% Tiếng Việt, code 100% Tiếng Anh
- **Encoding HTML**: UTF-8 không BOM bắt buộc — audit trước deploy: `python3 -c "import glob; [print('BAD' if open(f,'rb').read(3)==b'\xef\xbb\xbf' or 'Ã¡' in open(f).read() else 'OK', f) for f in glob.glob('*.html')]"`
