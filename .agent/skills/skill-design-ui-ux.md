# Kỹ năng: Thiết kế UI/UX Premium & Tối ưu hóa In ấn (Skill — UI/UX Design & Print Optimization)

Tài liệu này định nghĩa các nguyên tắc thiết kế giao diện Glassmorphism Dark Mode thời thượng và quy chuẩn tối ưu hóa trải nghiệm in ấn PDF khổ A4 nằm ngang.

---

## 1. Thiết kế Giao diện Glassmorphism Dark Mode Premium

Để tạo ấn tượng thị giác mạnh mẽ (WOW effect) nhưng vẫn đảm bảo khả năng sử dụng thực tế (Accessibility) và độ tương phản cao (High Contrast), bắt buộc tuân thủ hệ màu sắc và phong cách sau:

### A. Hệ thống Màu sắc (Color Tokens)
*   **Màu nền chính (Background)**: Nền tối sâu thẳm `#0d0e15` (Black-blue) giúp giảm mỏi mắt cho người dùng khi sử dụng ban đêm tại công trường.
*   **Màu thẻ chức năng (Glass Cards)**: Sử dụng màu nền trong suốt `#161925` với độ mờ đục `backdrop-filter: blur(12px)` và viền (border) mảnh `1px solid rgba(255, 255, 255, 0.08)`.
*   **Dải màu Gradient chủ đạo (Brand Gradient)**:
    - Neon Cyan sang Deep Purple: `linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)`.
    - Dùng cho các nút bấm quan trọng (Primary Call-to-Action), viền trang in nổi bật, hoặc các tiêu đề lớn.
*   **Màu sắc Trạng thái (Status Colors)**:
    - Xây tường (Xanh ngọc): `#00e676` (Neon Green).
    - Trát tường (Vàng cam): `#ff9100` (Orange-gold).
    - Ốp lát (Xanh dương): `#2979ff` (Bright Blue).
    - Tổng hợp (Tím neon): `#d500f9` (Purple Neon).
*   **Độ tương phản Văn bản (Text Contrast)**:
    - Tiêu đề & Văn bản chính: Màu trắng tinh khiết `#ffffff` (Độ tương phản 21:1 đối với nền tối).
    - Nhãn input & Chú thích phụ: Màu xám bạc `#a0aec0` hoặc `#cbd5e0` (Đảm bảo độ tương phản tối thiểu > 4.5:1 đạt chuẩn WCAG 2.1 AA).

### B. Hiệu ứng Micro-animations & Hoạt động Tương tác
*   **Hover effects**: Các nút bấm và thẻ chức năng phải có hiệu ứng dịch chuyển nhẹ `transform: translateY(-2px)` kết hợp đổ bóng mờ `box-shadow: 0 8px 25px rgba(0, 242, 254, 0.25)` và chuyển động mượt mà `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`.
*   **Focus states**: Các trường nhập liệu (Inputs) khi focus phải đổi màu viền sang Neon Cyan `#00f2fe` và đổ bóng lan tỏa `box-shadow: 0 0 10px rgba(0, 242, 254, 0.15)`.

---

## 2. Quy chuẩn Responsive Layout (Di động & Máy tính)

*   **Mobile-first / Grid System**:
    - Sử dụng `CSS Grid` và `Flexbox` linh hoạt.
    - Bố cục màn hình rộng: Sidebar quản lý nằm bên trái ($25\%$), Form nhập liệu nằm ở giữa ($45\%$), Bảng tính toán thời gian thực nằm bên phải ($30\%$).
    - Bố cục màn hình di động: Tự động xếp chồng thành 1 cột (Sidebar $\rightarrow$ Form nhập $\rightarrow$ Kết quả hiển thị ngay bên dưới). Điều này đặc biệt quan trọng để kỹ sư thao tác bằng một tay khi đang đo đạc ở công trường.

---

## 3. Tối ưu hóa Bản in & PDF Khổ A4 Ngang (Print CSS)

Để xuất bản bảng tổng hợp khối lượng vật tư (BOQ) sạch sẽ, sắc nét và chuyên nghiệp, CSS bắt buộc phải định nghĩa `@media print` như sau:

### A. Thiết lập Quy chuẩn Trang in `@page`
```css
@media print {
  @page {
    size: A4 landscape; /* Cấu hình khổ giấy A4 nằm ngang */
    margin: 1.2cm 1.5cm; /* Khoảng cách căn lề chuẩn */
  }
  
  /* Đổi toàn bộ màu chữ thành đen và nền thành trắng để tiết kiệm mực in */
  body {
    background: #ffffff !important;
    color: #000000 !important;
    font-family: 'Inter', sans-serif !important;
  }
}
```

### B. Các yếu tố cần ẩn khi in (Non-printable elements)
Khi in, bắt buộc phải ẩn toàn bộ các thành phần điều khiển giao diện:
- Sidebar trái điều hướng.
- Form nhập liệu và nút bấm ("Thêm hạng mục", "Tính toán", "Xóa", v.v.).
- Biểu đồ hình tròn Chart.js (nếu không cần thiết hoặc gây tốn mực).
- Phần chân trang (footer) hệ thống.
Sử dụng class `.no-print`:
```css
@media print {
  .no-print, 
  .sidebar, 
  .input-section, 
  .btn-group {
    display: none !important;
  }
}
```

### C. Tối ưu hóa Bảng BOQ In ấn
- Thẻ bảng (`table`) phải rộng $100\%$ chiều ngang giấy in.
- Đường viền mờ màu đen mỏng `1px solid #dddddd` cho các ô dữ liệu.
- Kích thước chữ in vừa phải `11pt` hoặc `12pt`, tiêu đề lớn `16pt` đậm.
- Tránh ngắt trang cắt ngang dòng chữ: `tr { page-break-inside: avoid; }`.
- Thêm phần chữ ký xác nhận của thợ xây/kỹ sư và chủ nhà ở cuối trang in để sẵn sàng ký kết.

---

## 4. Thiết kế UI/UX tối ưu chuyên biệt cho Người dự toán (Estimator-focused UI/UX)

Để giải quyết bài toán mỏi mắt do làm việc lâu với bảng số liệu và tăng tốc độ bóc tách khối lượng, thiết kế UI/UX bắt buộc phải tuân thủ các SOP sau:

### A. Thiết kế Nhập liệu Keyboard-First (Tăng tốc nhập liệu)
*   **Auto-select on Focus**: Lập trình Javascript để tự động bôi đen toàn bộ số trong ô input khi người dự toán click chuột hoặc nhấn `Tab` chuyển ô. Người dùng chỉ cần gõ đè số mới, loại bỏ hoàn toàn thao tác nhấn `Backspace` hay `Delete` thủ công.
*   **Tab Index**: Sắp xếp thứ tự các thẻ input trong form một cách khoa học từ trên xuống dưới, từ trái sang phải, đảm bảo phím `Tab` di chuyển tuần tự và trơn tru.

### B. Cấu trúc Màu sắc của Số liệu (Numeric Color Coding)
Người dự toán phải phân biệt được ngay các tầng dữ liệu số chỉ trong 0.5 giây:
*   **Số đầu vào (Input)**: Màu trắng sáng `#ffffff` rõ nét trên nền tối.
*   **Số lý thuyết (Theory)**: Màu xám dịu `#a0aec0` nhằm làm nền phụ, giảm sự nhiễu loạn thông tin.
*   **Số lượng mua thực tế (Final Qty)**: Màu Neon Cyan `#00f2fe` nổi bật để nhấn mạnh con số mang đi mua sắm vật tư.
*   **Thành tiền (Cost)**: Màu vàng cam ấm áp, cỡ chữ lớn, chữ đậm để làm nổi bật kết quả tài chính.

### C. Trình bày Bảng biểu Khoa học
*   **Căn lề (Text Alignment)**:
    - Cột văn bản (Tên vật tư, Quy cách, Đơn vị tính): Căn Trái (`text-align: left`) để dễ đọc tên.
    - Cột số liệu (Khối lượng lý thuyết, hao hụt, Khối lượng cần mua, Đơn giá, Thành tiền): **Bắt buộc căn Phải (`text-align: right`)** để các chữ số hàng nghìn, hàng triệu thẳng hàng dọc, giúp đối chiếu số liệu nhanh và chính xác hơn.
*   **Phân biệt Dòng (Table Styling)**:
    - Sử dụng zebra striping nhẹ nhàng để phân biệt các dòng chẵn/lẻ.
    - Hover dòng: Khi di chuột qua bất kỳ dòng nào, dòng đó phải sáng nhẹ lên để tránh mắt người dùng bị nhảy dòng khi duyệt bảng rộng.

### D. Quy chuẩn Typography & Tabular Numbers (Số Tabular chống lệch hàng)
Typography trong phần mềm dự toán đóng vai trò cực kỳ quan trọng đối với khả năng đọc hiểu dữ liệu:
*   **Phân phối phông chữ (Font Selection)**:
    - Sử dụng **Inter** cho bảng biểu, nhãn và văn bản chi tiết nhờ độ cao x-height lớn, các chữ cái có độ rõ nét cao, tránh nhầm lẫn giữa chữ `l` (L thường), `I` (i hoa), và số `1`.
    - Sử dụng **Montserrat** cho các tiêu đề lớn và hiển thị số tiền tổng cộng nhờ hình dáng hình học tròn trịa, hiện đại, vô cùng premium và hỗ trợ đầy đủ các ký tự tiếng Việt có dấu.
*   **Kỹ thuật Số Tabular (Tabular Numbers - Khuyên dùng tối thượng)**:
    - Theo mặc định, các chữ số có độ rộng khác nhau (ví dụ: số `1` hẹp hơn số `8`). Điều này làm cho các con số hàng dọc trong bảng bị thụt thò, không thẳng hàng hoàn hảo dù đã căn lề phải.
    - **SOP bắt buộc**: Áp dụng thuộc tính CSS `font-variant-numeric: tabular-nums;` cho tất cả các thẻ hiển thị số và ô input nhập đơn giá. Trình duyệt sẽ tự động ép độ rộng của mọi chữ số bằng nhau 100%, giúp các con số căn hàng dọc thẳng tắp như trong bảng Excel truyền thống, giúp người dự toán so sánh hàng dọc nhanh chóng và loại bỏ hoàn toàn rủi ro đọc chệch số.
*   **Giới hạn kích thước phông chữ**:
    - Không sử dụng kích thước phông chữ nhỏ hơn **12px** trên màn hình để bảo vệ thị lực người dự toán sau nhiều giờ làm việc liên tục. Cỡ chữ nhãn tiêu chuẩn là 13px - 14px; văn bản bảng biểu là 13px - 14px; tiêu đề chính là 20px - 28px.
