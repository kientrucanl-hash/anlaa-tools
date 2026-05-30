# MECALC — Dự toán ANLAA

Tool tính vật tư xây dựng miền Bắc (Xây & Trát, Cán nền, Ốp lát) với hệ thống quản lý dự án và phê duyệt.

---

## Yêu cầu hệ thống

- Node.js 20+
- npm 9+
- (Tùy chọn) Docker + Docker Compose

---

## Cài đặt và chạy

### Cách 1: Chạy trực tiếp

```bash
# 1. Cài dependencies
cd server
npm install

# 2. Tạo file cấu hình
cp .env.example .env

# 3. Tạo JWT_SECRET mạnh (bắt buộc, ít nhất 32 ký tự)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Điền kết quả vào JWT_SECRET trong .env

# 4. Khởi động
npm start
```

Truy cập: `http://localhost:4000`

### Cách 2: Docker Compose (khuyến nghị cho production)

```bash
# 1. Tạo .env ở thư mục gốc
echo "JWT_SECRET=$(node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")" > .env
echo "PORT=4000" >> .env
# Nếu cần restrict origin:
# echo "ALLOWED_ORIGINS=https://yourdomain.com" >> .env

# 2. Build và chạy
docker compose up -d

# 3. Kiểm tra health
curl http://localhost:4000/health
```

---

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `JWT_SECRET` | ✅ | Secret key ký JWT, tối thiểu 32 ký tự |
| `PORT` | Không | Port lắng nghe (mặc định: 4000) |
| `ALLOWED_ORIGINS` | Không | Danh sách origin CORS, phân cách bằng dấu phẩy. Để trống = cho phép tất cả |
| `LOG_LEVEL` | Không | Mức log: `error`, `warn`, `info` (mặc định), `debug` |

---

## Cấu hình Nginx (production)

```nginx
server {
    listen 443 ssl;
    server_name mecalc.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/mecalc.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mecalc.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name mecalc.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

---

## Backup database

Database lưu tại `server/db/anlaa.db` (SQLite). Backup định kỳ:

```bash
# Manual backup
cp server/db/anlaa.db server/db/anlaa_$(date +%Y%m%d).db

# Với Docker (volume mount)
docker run --rm -v anlc_data:/data -v $(pwd)/backup:/backup alpine \
    cp /data/anlaa.db /backup/anlaa_$(date +%Y%m%d).db
```

---

## Logs

Logs lưu tại thư mục `logs/`:
- `logs/combined.log` — Toàn bộ request logs (tự rotate khi > 5 MB, giữ 5 file)
- `logs/error.log` — Chỉ lỗi

---

## API Endpoints

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/health` | Không | Health check |
| POST | `/api/auth/login` | Không | Đăng nhập (rate limit: 10 req/15 phút) |
| GET | `/api/auth/me` | User | Thông tin phiên hiện tại |
| GET | `/api/projects` | User | Danh sách dự án |
| POST | `/api/projects` | User | Tạo dự án mới |
| PUT | `/api/projects/:id` | User | Cập nhật dự án (chỉ draft/rejected) |
| PUT | `/api/projects/:id/submit` | User | Nộp duyệt |
| PUT | `/api/projects/:id/approve` | Admin | Duyệt |
| PUT | `/api/projects/:id/reject` | Admin | Từ chối |
| DELETE | `/api/projects/:id` | Admin | Xóa |
| GET | `/api/projects/meta/users` | Admin | Danh sách users |

---

## Tài khoản mặc định

Xem `ACCOUNTS.local.md` (không commit, chỉ dùng nội bộ). Đổi mật khẩu ngay sau lần đầu deploy.

---

## Checklist trước khi deploy

- [ ] `JWT_SECRET` đã tạo mới (không dùng giá trị mặc định)
- [ ] `.env` không được commit vào git
- [ ] Nginx đã cấu hình SSL
- [ ] Port 4000 không expose trực tiếp ra internet
- [ ] Backup database đã lên lịch
- [ ] Đã đổi mật khẩu tài khoản mặc định
 
