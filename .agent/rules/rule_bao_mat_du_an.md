# Rule: Bảo Mật Dự Án MECALC (ANLAA Tools)

Áp dụng cho mọi tác vụ liên quan đến project này. Bổ sung cho `rule_bao_mat_va_an_toan.md` cấp global.

---

## Tài sản nhạy cảm — KHÔNG được đọc to, log, hoặc commit

| File / Path | Nội dung | Xử lý |
|-------------|----------|-------|
| `server/.env` | JWT_SECRET, PORT | Chỉ đọc để kiểm tra cấu trúc, không in giá trị |
| `ACCOUNTS.local.md` | Tài khoản mặc định (admin/user) | Chỉ tham khảo nội bộ, không commit, không xóa |
| `server/db/anlaa.db` | Dữ liệu người dùng và dự án thực | Không commit, không đọc trực tiếp ngoài server code |
| `server/db/anlaa_data.json` | Dữ liệu JSON cũ (legacy) | Không commit, đã migrate sang SQLite |
| `logs/` | Request logs, error logs | Không commit, không đọc to trong response |

---

## Quy tắc với `server/.env`

- **Không bao giờ** sinh hoặc gợi ý JWT_SECRET cụ thể trong câu trả lời
- Khi cần JWT_SECRET mới: chỉ hướng dẫn cách tạo, không tạo hộ:
  ```
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Nếu cần đọc `.env` để debug: chỉ kiểm tra key tồn tại, không in value

---

## Quy tắc với database

- Mọi thay đổi schema phải backward-compatible (không drop column/table có dữ liệu)
- Không viết query raw SQL với user input chưa qua parameterized statement
- Trước khi migrate schema: nhắc user backup `server/db/anlaa.db`
- File `anlaa.db`, `anlaa.db-shm`, `anlaa.db-wal` đã có trong `.gitignore` — không được gỡ bỏ rule này

---

## Quy tắc với authentication

- Không thay đổi thuật toán hash (hiện tại: bcryptjs cost=10) mà không migration plan
- Không rút ngắn JWT expiry xuống dưới 1h hoặc kéo dài quá 24h mà không hỏi
- Không thêm endpoint bypass authentication dù là "chỉ để test"
- Rate limiting (`/api/auth/login`: 10 req/15 phút) — không tắt, chỉ nới nếu có lý do rõ ràng

---

## Quy tắc với frontend

- Không nhúng thông tin xác thực (token, password) vào HTML/JS tĩnh
- Không log `localStorage` hoặc session token ra console
- Mọi input từ user (tên dự án, địa chỉ) phải qua validation trước khi gửi API

---

## Quy tắc deploy

- **Trước khi deploy lên server mới**: xác nhận JWT_SECRET đã được tạo mới (không dùng giá trị trong `ACCOUNTS.local.md`)
- **Không** chạy server với `NODE_ENV=development` trên môi trường production
- **Không** expose port 4000 trực tiếp ra internet — phải qua Nginx/reverse proxy
- Volume Docker mount `anlc_data:/app/server/db` phải được backup định kỳ

---

## Checklist trước khi thêm tính năng mới

- [ ] Endpoint mới có qua `requireAuth` hoặc `requireAdmin` không?
- [ ] Input mới có qua joi validation không?
- [ ] Response có vô tình trả về `password_hash` không?
- [ ] Có log sensitive data trong Winston không?
- [ ] `.gitignore` đã cover file mới sinh ra chưa?

---

## File không được xóa hoặc sửa cấu trúc

| File | Lý do |
|------|-------|
| `ACCOUNTS.local.md` | Tài liệu nội bộ — tham khảo khi reset môi trường dev |
| `server/.env.example` | Template onboarding cho deploy mới |
| `.gitignore` | Bảo vệ secrets và db khỏi commit |
| `server/middleware/auth.js` | Tầng bảo vệ trung tâm — chỉ sửa khi có security review |

---

*Tạo ngày 2026-05-29. Cập nhật khi stack thay đổi.*
