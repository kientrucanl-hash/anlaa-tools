# Quy trình Phát triển & Kiểm thử Đa Nền tảng (Responsive QA & Dev Workflow)

Quy trình này hướng dẫn các nhà phát triển và Agent thực hiện quy trình phát triển tính năng mới và kiểm thử chất lượng giao diện (QA) trên cả thiết bị di động và máy tính đối với công cụ MECALC.

---

## 1. Quy trình Phát triển Tính năng thích ứng (Adaptive Dev Flow)

Mọi tính năng mới hoặc nâng cấp thuật toán phải tuân theo luồng phát triển thích ứng để đảm bảo trải nghiệm đồng nhất:

```
[BƯỚC 1] Code Logic & Đơn vị tính (constants.js & calculator.js)
    │
[BƯỚC 2] Dựng giao diện Desktop & Kết nối DOM (index.html & app.js)
    │
[BƯỚC 3] Tối ưu hóa Responsive & Touch Gestures cho Mobile (styles.css & touch.js)
    │
[BƯỚC 4] QA Đa Thiết Bị & Kiểm thử Khổ in A4 Landscape
```

- **Bước 1: Code Logic thuần (Engine)**: Hoàn thiện toàn bộ logic tính toán bằng English 100%. Đảm bảo hàm tính toán hoạt động đúng số học lý thuyết và quy đổi làm tròn thương mại.
- **Bước 2: Xây dựng giao diện Desktop core**: Liên kết logic với DOM, xử lý sự kiện keyboard-first, tự động bôi đen khi focus (`Auto-select on focus`).
- **Bước 3: Tối ưu CSS Responsive**: Thêm các CSS media queries điều chỉnh kích thước touch target, cỡ chữ input >= 16px để chống zoom iOS, và thiết kế off-canvas menu di động.
- **Bước 4: Kiểm thử đa thiết bị (QA)**: Chạy thử nghiệm trên các viewport khác nhau và giả lập in ấn.

---

## 2. Quy trình Kiểm thử Chất lượng (Responsive QA Checklist)

Trước khi đóng gói phiên bản mới hoặc deploy staging, lập trình viên/Agent bắt buộc phải chạy checklist kiểm thử 5 điểm sau:

### Điểm 1: Kiểm thử trên các kích thước Viewport giả lập
- **Cách thực hiện**: Mở Chrome DevTools -> Bật Device Mode (Ctrl + Shift + M) -> Kiểm tra hiển thị tại 3 thiết bị:
  1. *iPhone SE / 12 Pro (Mobile - 375px/390px)*: Sidebar phải ẩn đi hoàn toàn, kích hoạt hamburger menu. BOQ table cuộn ngang mượt mà, không méo.
  2. *iPad Air / Mini (Tablet - 768px/820px)*: Giao diện căn chỉnh gọn gàng, sidebar thu gọn thích hợp.
  3. *Desktop (1440px / 1920px)*: Sidebar cố định bên trái, workspace bên phải chia 2 cột (form & real-time preview) song song cân đối.

### Điểm 2: Kiểm thử Bàn phím số tự động (Mobile Input)
- **Cách thực hiện**: Mở ứng dụng trên thiết bị di động thực tế hoặc thông qua giả lập di động đầy đủ của Android Studio / Xcode Simulator.
- **Yêu cầu**: Nhấp vào ô nhập số và đảm bảo bàn phím số (Numpad) của hệ điều hành tự động bật lên. Ô nhập số không bị zoom lệch giao diện (đã set font size >= 16px).

### Điểm 3: Kiểm thử sự kiện Bôi đen khi Focus (Auto-select on focus)
- **Cách thực hiện**:
  - Dùng phím `Tab` di chuyển qua lại các ô nhập liệu trên Desktop -> Đảm bảo khi focus vào bất kỳ ô nhập số nào (kể cả ô đơn giá và ô trong bảng chi tiết), toàn bộ số đều tự động bôi đen.
  - Bấm nút "Thêm bức tường" hoặc "Thêm cửa" -> Nhấp vào ô input mới sinh ra -> Đảm bảo hiệu ứng bôi đen vẫn hoạt động hoàn hảo.

### Điểm 4: Kiểm thử Khổ in & PDF (A4 Landscape)
- **Cách thực hiện**: Nhấp chuột phải -> Chọn Print (hoặc nhấn `Ctrl + P`).
- **Yêu cầu**:
  - Khổ giấy mặc định phải tự chuyển sang **Landscape (A4 ngang)**.
  - Sidebar, header, các nút bấm điều khiển biến mất hoàn toàn.
  - Nền tối chuyển sang nền trắng, chữ đen sắc nét.
  - Dòng khuyến cáo (Disclaimer) hiển thị nổi bật ở chân trang.

---

> [!IMPORTANT]
> *Chỉ khi toàn bộ 4 điểm kiểm thử trên đều đạt trạng thái ĐẠT (Passed), mã nguồn mới đủ điều kiện để merge PR hoặc deploy lên môi trường staging/production.*
