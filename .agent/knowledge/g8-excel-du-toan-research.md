# Nghiên Cứu: G8 và Excel trong Dự Toán Xây Dựng Việt Nam

*Tài liệu tham khảo cho việc thiết kế tính năng Dự Toán Chi Phí của MECALC*
*Cập nhật: 2026-05-30*

---

## 1. Phần Mềm G8 — Tổng Quan

### Mục đích
G8 (G8 Settlement) là phần mềm dự toán – quyết toán dành cho **công trình nhà nước**. Tính toán theo định mức nhà nước (thông tư, nghị định). Không phù hợp trực tiếp cho nhà dân.

### Giao Diện — Các Sheet Chính
| Sheet | Chức năng |
|-------|-----------|
| `Công Trình` | Nhập danh sách công tác (bảng tiên lượng chính) |
| `Giá Tháng` | Nhập giá vật liệu theo tháng/địa phương |
| `Đầu Vào` | Nhập lương nhân công, phụ cấp, nhiên liệu |
| `Nhân Công/Máy` | Tự động tính sau khi nhập Đầu Vào |
| `CVC & Cước bộ` | Cước vận chuyển theo vùng |

### Cấu Trúc Bảng Công Tác (G8)
```
STT | Mã hiệu | Tên công tác | ĐVT | Khối lượng | Đơn giá VL | Đơn giá NC | Đơn giá Máy | Thành tiền
```

### Phân Cấp
```
Phần → Chương → Mục → Công tác (có mã hiệu định mức)
```

### Cách Tra Mã Hiệu
- Nhập mã code (ví dụ: `AA.11110`) → autocomplete
- Hoặc tìm theo tên → chọn từ danh sách định mức

### Điểm KHÔNG áp dụng cho nhà dân
- Cần mã hiệu định mức (chỉ cần cho dự án nhà nước)
- Tách riêng VL/NC/Máy (nhà dân dùng đơn giá gộp)
- VAT bắt buộc (nhà nước phải xuất hóa đơn)
- Nhiều sheet phức tạp

### Nguồn
- https://phanmemg8.com.vn/huong-dan-su-dung-co-ban-phan-mem-du-toan-g8/
- https://phanmemg8.vn/huong-dan-su-dung-du-toan-g8/
- https://mocphat.vn/huong-dan-su-dung-phan-mem-g8-2020/
- https://fastcons.fastwork.vn/review-phan-mem-du-toan-g8/

---

## 2. Excel BOQ Template — Cấu Trúc Chuẩn

### Cấu Trúc Bảng Tiên Lượng / BOQ
```
STT | Tên công tác/hạng mục | ĐVT | Khối lượng | Đơn giá | Thành tiền | Ghi chú
```

Hoặc phiên bản có kích thước (phổ biến hơn):
```
STT | Tên hạng mục | ĐVT | Dài | Rộng/Sâu | Cao | KL | Đơn giá | Thành tiền
```
→ KL tự động = Dài × Rộng/Sâu × Cao

### Phân Cấp Bằng Header Rows
- Dòng header (in đậm, không có số liệu): tên nhóm/phần/tầng
- Ví dụ: **PHẦN A: TẦNG 1**, **PHẦN B: TẦNG 2**

### Hàm Excel Thường Dùng
- `VLOOKUP` / `XLOOKUP`: Tra đơn giá từ sheet database
- `SUMIF`: Tổng theo hạng mục/loại vật tư
- `SUM`: Tổng thành tiền
- `IF + AND`: Kiểm tra điều kiện nhập liệu

### Pattern Lookup Đơn Giá
```excel
=VLOOKUP(A6, 'BangGia'!$A:$C, 3, 0)
```
Hoặc pattern nâng cao (không cần VLOOKUP):
```excel
=LOOKUP(1, 1/(A6='ChietTinh'!$L$20:$L$1470), 'ChietTinh'!$J$20:$J$1470)
```

### Điểm áp dụng cho MECALC
- Cấu trúc cột đơn giản + group kích thước Dài/Rộng/Cao
- Header rows phân nhóm (Tầng 1, Tầng 2, Nhà xe...)
- Cột ghi chú diễn giải khối lượng
- Lookup đơn giá từ bảng chuẩn (tương đương bảng "Đơn Giá Thi Công" trong MECALC)

### Nguồn
- https://fastcons.fastwork.vn/mau-du-toan-xay-dung-bang-excel/
- https://aihocdutoan.com/lap-bang-tong-hop-don-gia-du-thau-chi-bang-excel/
- https://lamketoan.vn/mau-du-toan-xay-dung-bang-excel.html
- https://giaxaydung.vn/threads/bai-03-ma-vba-excel-ham-kl-tinh-khoi-luong-cong-tac-xay-dung.115740/

---

## 3. Logic Tính Khối Lượng — Bảng Diễn Giải (G8 Standard)

### Tên gọi
- G8/Excel gọi là **"Bảng Diễn Giải Khối Lượng"** hoặc **"Bảng Bóc Tách Khối Lượng"**
- Đây là chuẩn chuyên nghiệp trong dự toán xây dựng Việt Nam

### Cấu Trúc — Nhiều Dòng Cho 1 Công Tác
Mỗi công tác có **nhiều dòng diễn giải**, mỗi dòng là một cấu kiện/phần tử riêng biệt:

```
Diễn giải          │  n │    L  │   W  │    H  │  hs │ KL dòng
───────────────────┼────┼───────┼──────┼───────┼─────┼─────────
Tường trục A-B     │  1 │ 10.50 │      │  3.00 │  +1 │  31.50
Tường trục C-D     │  2 │  8.20 │      │  3.00 │  +1 │  49.20
Trừ cửa đi D01     │  3 │  0.90 │      │  2.10 │  -1 │  -5.67
Trừ cửa sổ S01     │  4 │  1.20 │      │  1.20 │  -1 │  -5.76
───────────────────┴────┴───────┴──────┴───────┴─────┼─────────
                                             Tổng KL │  69.27 m²
```

### Tên Cột Chính Xác Theo G8 (từ ảnh chụp thực tế)

```
STT | Số C.K | [Kích thước: Dài | Rộng | Cao] | Hệ số phụ | Tổng dài | D.tích (M2) | K.L C.Kiện
```

| Cột G8 | Tên trong model | Mô tả | Ghi chú |
|--------|----------------|-------|---------|
| **Số C.K** | `n` | Số cấu kiện | Mặc định = 1 |
| **Dài** | `l` | Chiều dài (m) | Bắt buộc |
| **Rộng** | `w` | Chiều rộng/sâu (m) | Tùy chọn |
| **Cao** | `h` | Chiều cao (m) | Tùy chọn |
| **Hệ số phụ** | `hs` | Hệ số điều chỉnh | +1 = cộng, -1 = trừ (cửa/lỗ) |
| **Tổng dài** | tính tự động | = Số C.K × Dài × Hệ số phụ | Cột trung gian |
| **D.tích (M2)** | tính tự động | = Tổng dài × Rộng | Cột trung gian |
| **K.L C.Kiện** | `rowQty` | = D.tích × Cao (hoặc kết quả cuối) | Cột kết quả |

> **Kích thước** là một **group header** bao gồm 3 cột con: Dài, Rộng, Cao — như trong ảnh chụp G8.

### Công Thức Mỗi Dòng
```
Tổng dài   = Số C.K × Dài × Hệ số phụ
D.tích     = Tổng dài × Rộng            (nếu có Rộng)
K.L C.Kiện = D.tích × Cao               (nếu có Cao)
           = Tổng dài × Rộng × Cao
           = n × L × W × H × hs
```

**Quy tắc KL — phụ thuộc ĐVT và loại hạng mục, KHÔNG phải 1 công thức cố định:**

| ĐVT | Chiều dùng | Công thức | Ví dụ hạng mục |
|-----|-----------|-----------|----------------|
| **md** (mét dài) | Dài | `n × L × hs` | Cọc nhồi, thanh thép, máng kỹ thuật |
| **m²** (diện tích ngang) | Dài × Rộng | `n × L × W × hs` | Cán nền, lát nền, đào đất mặt bằng |
| **m²** (diện tích đứng) | Dài × Cao | `n × L × H × hs` | Xây tường, trát tường, sơn tường |
| **m³** (thể tích) | Dài × Rộng × Cao | `n × L × W × H × hs` | Đào đất hố móng, đổ bê tông, đắp đất |
| **cái/bộ** | Số C.K | `n × hs` | Cửa, cầu thang, thiết bị vệ sinh |

> **Quan trọng:** `workItemKey` trong data model phải định nghĩa sẵn `unit` và `formula` (chiều nào được dùng). Khi user chọn hạng mục, các cột kích thước không liên quan sẽ bị ẩn/disable tự động.

### Tổng KL Công Tác
```javascript
totalQty = rows.reduce((sum, row) => {
    const { n=1, l, w, h, hs=1 } = row;
    if (!l) return sum;
    let q = l;
    if (w) q *= w;
    if (h) q *= h;
    return sum + q * n * hs;
}, 0);
```

### Ưu Điểm So Với 1 Dòng Đơn Giản
- **Kiểm soát được**: Nhìn vào là hiểu số đến từ đâu
- **Trừ ô cửa/cửa sổ** tự động trong cùng bảng (hs = -1)
- **Nhân nhiều cấu kiện giống nhau** bằng cột n (không cần copy nhiều dòng)
- **Thanh quyết toán** dễ dàng vì có diễn giải rõ ràng

### Công Thức Theo Từng Loại Công Tác — Chuẩn Định Mức Việt Nam

> Quy tắc: ĐVT quyết định chiều nào được dùng. Chiều không dùng → ẩn/disable trên UI.

#### Phần Thô (Kết Cấu)

| Công tác | ĐVT | Chiều dùng | Công thức | Ghi chú |
|----------|-----|-----------|-----------|---------|
| Đào đất hố móng | m³ | L × W × H | `n × L × W × H × hs` | H = chiều sâu |
| Đắp đất | m³ | L × W × H | `n × L × W × H × hs` | |
| Bê tông móng băng | m³ | L × W × H | `n × L × W × H × hs` | W=bề rộng móng, H=chiều dày |
| Bê tông móng đơn | m³ | L × W × H | `n × L × W × H × hs` | |
| Bê tông cột | m³ | L × W × H | `n × L × W × H × hs` | L=W=tiết diện, H=chiều cao cột |
| Bê tông dầm | m³ | L × W × H | `n × L × W × H × hs` | W=bề rộng, H=chiều cao dầm |
| Bê tông sàn | m³ | L × W × H | `n × L × W × H × hs` | H=chiều dày sàn (VD: 0.1m) |
| Xây tường gạch | **m²** | **L × H** | `n × L × H × hs` | Bỏ W — độ dày đã trong mã hiệu (110/220mm) |
| Ván khuôn | m² | L × H | `n × L × H × hs` | Diện tích bề mặt tiếp xúc |
| Cốt thép | kg/tấn | Phức tạp | Tính theo bảng thép riêng | Không dùng L×W×H đơn giản |

#### Phần Hoàn Thiện

| Công tác | ĐVT | Chiều dùng | Công thức | Ghi chú |
|----------|-----|-----------|-----------|---------|
| Trát tường (đứng) | m² | **L × H** | `n × L × H × hs` | Tường đứng: dài × cao |
| Trát trần | m² | **L × W** | `n × L × W × hs` | Trần ngang: dài × rộng |
| Cán nền xi măng | m² | **L × W** | `n × L × W × hs` | Sàn ngang |
| Lát nền gạch | m² | **L × W** | `n × L × W × hs` | Sàn ngang |
| Ốp tường gạch | m² | **L × H** | `n × L × H × hs` | Tường đứng |
| Trần thạch cao | m² | **L × W** | `n × L × W × hs` | Ngang |
| Sơn tường trong | m² | **L × H** | `n × L × H × hs` | Tường đứng |
| Sơn tường ngoài | m² | **L × H** | `n × L × H × hs` | |
| Bả bột putty | m² | **L × H** | `n × L × H × hs` | Cùng diện tích với sơn |
| Chống thấm sàn | m² | **L × W** | `n × L × W × hs` | Sàn ngang |
| Chống thấm tường | m² | **L × H** | `n × L × H × hs` | Tường đứng |
| Ốp đá/gỗ tường | m² | **L × H** | `n × L × H × hs` | |
| Lát đá sàn | m² | **L × W** | `n × L × W × hs` | |

#### Công Tác Đơn Vị

| Công tác | ĐVT | Chiều dùng | Ghi chú |
|----------|-----|-----------|---------|
| Lắp cửa đi | cái/bộ | n (chỉ số lượng) | L×H nhập để tra đơn giá theo size |
| Lắp cửa sổ | cái/bộ | n | |
| Lan can/hàng rào | md | **L** | n × L |
| Đường dạo | m² | L × W | |
| Điện âm tường | m | **L** | n × L |
| Ống nước | m | **L** | n × L |
| Thiết bị vệ sinh | bộ | n | |

#### Quy Tắc Trừ Lỗ Mở (hs = -1)
- Lỗ cửa đi/cửa sổ trong tường xây: `n × W_cửa × H_cửa × hs(-1)`  
- Lỗ kỹ thuật < 0.25 m²: **không trừ** (theo Thông tư 13/2021/TT-BXD)
- Cột nằm trong tường: trừ diện tích cột chiếm chỗ

### Nguồn
- https://viet-thanh.vn/file-excel-boc-tach-khoi-luong-day-du-nhat/
- https://myexcel.vn/ham-dien-giai-khoi-luong-trong-excel-ho-tro-ky-su-lap-du-toan-quyet-toan-cong-trinh-xay-dung/
- https://hocthatnhanh.vn/cach-the-hien-bang-boc-tach-khoi-luong-chi-tiet-tren-excel
- https://dutoanxaydung.vn/boc-tach-khoi-luong/huong-dan-boc-tach-khoi-luong.html
- https://hoatieu.vn/bieu-mau/mau-bang-chi-tiet-khoi-luong-cong-tac-xay-dung-193055
- https://kiemdinhxaydungmiennam.com/tinh-khoi-luong-cua-ket-cau/
- https://bilico.vn/cach-tinh-khoi-luong-be-tong
- https://sotay365.com/tinh-khoi-luong-dao-dat.html
- https://gizento.vn/khoa-hoc/boc-tach-vat-tu-va-lap-du-toan-nha-pho-bang-g8/
- Thông tư 13/2021/TT-BXD — Phương pháp đo bóc khối lượng công trình xây dựng

---

## 4. Kết Luận Thiết Kế MECALC (Nhà Dân)

### Cấu Trúc Bảng Dự Toán Chi Phí — Áp Dụng G8 Pattern

Mỗi **hạng mục** (công tác) là 1 header row có thể expand/collapse:

```
STT │ Hạng mục / Diễn giải   │ĐVT│ n │   L   │   W   │   H   │ hs │  KL  │ Đơn giá │ Thành tiền
────┼────────────────────────┼───┼───┼───────┼───────┼───────┼────┼──────┼─────────┼───────────
▼ 1 │ Xây tường 110          │m² │   │       │       │       │    │69.27 │ 250,000 │17,317,500  ← header
    │  ↳ Tường trục A-B      │   │ 1 │ 10.50 │       │  3.00 │  + │31.50 │         │
    │  ↳ Tường trục C-D      │   │ 2 │  8.20 │       │  3.00 │  + │49.20 │         │
    │  ↳ Trừ cửa đi D01      │   │ 3 │  0.90 │       │  2.10 │  - │-5.67 │         │
    │  ↳ Trừ cửa sổ S01      │   │ 4 │  1.20 │       │  1.20 │  - │-5.76 │         │
    │  [+ thêm dòng]         │   │   │       │       │       │    │      │         │
▶ 2 │ Trần thạch cao [custom]│m² │   │       │       │       │    │86.10 │  95,000 │ 8,179,500  ← collapsed
```

### Data Model
```javascript
constructionItems = [{
    id: "uuid",
    name: "Xây tường 110",
    unit: "m²",
    workItemKey: "masonry-110", // lookup đơn giá
    isAuto: true,               // sinh từ module tính
    expanded: false,
    rows: [
        { desc: "Tường trục A-B", n: 1, l: 10.5, w: null, h: 3.0, hs: 1  },
        { desc: "Tường trục C-D", n: 2, l: 8.2,  w: null, h: 3.0, hs: 1  },
        { desc: "Trừ cửa đi D01", n: 3, l: 0.9,  w: null, h: 2.1, hs: -1 },
        { desc: "Trừ cửa sổ S01", n: 4, l: 1.2,  w: null, h: 1.2, hs: -1 }
    ],
    unitPrice: 250000
    // totalQty tính runtime
}]
```

### Hàm Tính KL (chuẩn G8)
```javascript
function calcRowQty({ n = 1, l, w, h, hs = 1 }) {
    if (!l) return 0;
    let qty = l;
    if (w) qty *= w;
    if (h) qty *= h;
    return qty * n * hs;
}
const totalQty = rows.reduce((sum, r) => sum + calcRowQty(r), 0);
```

### Bảng Đơn Giá Thi Công Mặc Định (Hà Nội Q1/2025)
User có thể cập nhật, lưu vào localStorage:

| Key | Hạng mục | ĐVT | Đơn giá |
|-----|----------|-----|---------|
| `masonry-110` | Xây tường gạch 110 | m² | 250,000 |
| `masonry-220` | Xây tường gạch 220 | m² | 350,000 |
| `masonry-aac-110` | Xây tường AAC 100mm | m² | 220,000 |
| `plastering-1-face` | Trát tường 1 mặt | m² | 65,000 |
| `plastering-2-face` | Trát tường 2 mặt | m² | 120,000 |
| `screed` | Cán nền phẳng | m² | 85,000 |
| `tiling-floor` | Lát nền gạch | m² | 180,000 |
| `tiling-wall` | Ốp tường gạch | m² | 200,000 |

### Không Cần (khác G8 — nhà nước)
- ❌ Mã hiệu định mức (AA.11110...)
- ❌ Tách VL / Nhân công / Máy
- ❌ Sheet Giá tháng / Đầu vào / Cước vận chuyển
- ❌ VAT bắt buộc

### Cần Thêm So Với MECALC Hiện Tại
- ✅ Bảng diễn giải G8: expand/collapse rows với n × L × W × H × hs
- ✅ Bảng đơn giá thi công tổng hợp (user cập nhật được)
- ✅ Auto-populate từ kết quả module tính toán
- ✅ Custom hạng mục (trần, sơn, điện, cửa...)
- ✅ Dự phòng % toggle
- ✅ Output song song: Bảng vật tư (đã có) + Dự toán chi phí (mới)
