# Quy tắc Workspace (Workspace Rules) — Dự án Tool Tính Vật tư Xây - Trát - Ốp lát

Tài liệu này định nghĩa các quy tắc bắt buộc áp dụng cho toàn bộ quá trình phát triển và vận hành công cụ tính toán vật tư tại Workspace `g:\.AIWork\.anlaa-tools`.

---

## 1. Nghiệp vụ Xây dựng miền Bắc & Hà Nội (Business Rules)

*   **WR-1 (Kích thước gạch)**: Chỉ sử dụng kích thước gạch xây tiêu chuẩn miền Bắc:
    - Gạch đặc đỏ: $6.5 \times 10.5 \times 22\text{ cm}$.
    - Gạch rỗng 2 lỗ: $6.5 \times 10.5 \times 22\text{ cm}$.
    - Tuyệt đối không hardcode kích thước gạch miền Nam ($8 \times 8 \times 18\text{ cm}$) vào các tính toán mặc định.
*   **WR-2 (Quy cách tường)**: Định nghĩa tường xây gồm:
    - Tường 110 (Tường đơn - dày 110mm chưa trát).
    - Tường 220 (Tường đôi - dày 220mm chưa trát).
*   **WR-3 (Phương pháp ốp lát)**: Hỗ trợ bắt buộc 2 phương án:
    - Keo dán gạch nguyên chất.
    - Hỗn hợp Keo dán gạch trộn Xi măng theo tỷ lệ khối lượng tùy chỉnh (mặc định 1 Keo : 1 Xi măng).
*   **WR-4 (Quy cách đóng gói thương mại)**:
    - Keo dán gạch: Mặc định bao $25\text{ kg}$.
    - Xi măng PC40: Mặc định bao $50\text{ kg}$.
    - Mọi kết quả quy đổi ra số bao phải được làm tròn lên (ceil) để đảm bảo thực tế thi công không bị thiếu hụt.

---

## 2. Tiêu chuẩn Mã nguồn & Lập trình (Coding Standards)

*   **WR-5 (Quy tắc đặt tên — Naming Conventions)**:
    - Tên file & thư mục: `kebab-case` (ví dụ: `calculator-helper.js`, `styles.css`).
    - Tên biến & hàm: `camelCase` (ví dụ: `calculateTilingVolume()`, `brickCost`).
    - Hằng số định mức: `UPPER_SNAKE_CASE` (ví dụ: `CEMENT_M75_FACTOR`).
    - Các class/component: `PascalCase` (nếu có).
*   **WR-6 (Ngôn ngữ lập trình)**:
    - Giao diện người dùng, tooltip, báo cáo xuất bản: **Tiếng Việt 100%** chuẩn kỹ thuật.
    - Mã nguồn (tên hàm, tên biến, cấu trúc dữ liệu, chú thích/comment): **Tiếng Anh 100%**.
*   **WR-7 (Xử lý lỗi - Error Handling)**:
    - Phải kiểm tra và validate dữ liệu đầu vào tại client-side (chặn số âm, ký tự lạ, rỗng).
    - Thông báo lỗi giao diện phải trực quan và thân thiện bằng Tiếng Việt (ví dụ: *"Vui lòng nhập chiều dài lớn hơn 0"*).

---

## 3. Quy chuẩn Thiết kế UI/UX (Design & Aesthetic Rules)

*   **WR-8 (Phong cách giao diện)**:
    - Sử dụng **Glassmorphism Premium Dark Mode** làm theme chính để wow người dùng ngay từ cái nhìn đầu tiên.
    - Bảng màu: Nền tối sâu thẳm (`#0d0e15`), thẻ glass mờ ảo có phủ border mảnh tinh tế, dải màu gradient Neon Cyan (`#00f2fe`) và Deep Purple (`#4facfe`).
    - Font chữ: Sử dụng **Outfit** hoặc **Inter** từ Google Fonts.
*   **WR-9 (Tối ưu hóa In ấn & PDF)**:
    - Thiết lập `@media print` mặc định khổ giấy **A4 ngang (landscape)**.
    - Ẩn sidebar, form nhập liệu, và các nút bấm điều khiển khi in. Chỉ hiển thị bảng BOQ (Bill of Quantities) định dạng sạch sẽ, độ tương phản cao, chữ đen nền trắng để tiết kiệm mực và dễ đọc.
*   **WR-10 (Xuất ảnh BOQ)**:
    - Tích hợp `html2canvas` để chụp đúng vùng bảng BOQ tổng hợp, lưu tên file dạng `boq-can-ho-[timestamp].png`.

---

## 4. An toàn & Nhật ký (Audit Trail)

*   **WR-11 (Ghi nhật ký phiên)**:
    - Mọi thay đổi cấu hình tính toán quan trọng hoặc xuất file phải được ghi nhận vào file log `02_Process/audit_log/audit.log`.
    - Định dạng log: `[YYYY-MM-DD HH:mm:ss] [ACTION] - Details`.
*   **WR-12 (Quy chuẩn an toàn vận hành & Human-in-the-Loop)**:
    - Bắt buộc thiết lập cơ chế kiểm duyệt và phê duyệt của con người trước khi áp dụng bảng BOQ vào mua sắm thực tế để tránh rủi ro nhập sai dữ liệu.
    - Phải hiển thị dòng khuyến cáo nghiệp vụ (Disclaimer) rõ ràng màu vàng/cam nổi bật ở chân bảng hiển thị BOQ trên UI và trên bản in PDF xuất bản.
    - Cho phép con người can thiệp trực tiếp vào 2 tham số biến động: Đơn giá vật liệu địa phương và Hệ số hao hụt (%) để hệ thống tự tính toán dưới sự kiểm duyệt tối cao của con người.

---

## 5. Quy tắc UI/UX chuyên dụng cho Người dự toán (Estimator UI/UX Rules)

*   **WR-13 (Ưu tiên Bàn phím - Keyboard-First)**:
    - Toàn bộ form nhập liệu phải di chuyển tuần tự khoa học bằng phím `Tab`.
    - **Bắt buộc**: Lập trình hiệu ứng **tự động bôi đen toàn bộ số trong ô input khi focus (Auto-select on focus)**. Người dự toán sử dụng bàn phím Numpad nhập đè số mới cực nhanh mà không cần xóa số cũ.
*   **WR-14 (Phân định Màu sắc Số liệu - Number Color Coding)**:
    - Số đầu vào (Input): Màu trắng sáng `#ffffff` rõ nét.
    - Số tính toán lý thuyết (Theory): Màu xám dịu mắt `#a0aec0` để làm nền phụ, tránh rối mắt.
    - Khối lượng mua sắm thương mại thực tế (Final Quantity): Màu Neon Cyan `#00f2fe` nổi bật để thu hút sự chú ý vì đây là số lượng cần mua.
    - Thành tiền dự toán (Cost): Màu xanh lá cây sáng hoặc vàng cam đậm, cỡ chữ lớn hơn để nổi bật giá trị tài chính.
*   **WR-15 (Quy chuẩn Bảng biểu Chuyên nghiệp - Table Hierarchy)**:
    - Cột văn bản (Tên vật tư, Quy cách, Đơn vị tính): Căn Trái (Align Left) để dễ đọc.
    - Cột số liệu (Định mức, Hao hụt, Khối lượng cần mua, Đơn giá, Thành tiền): **Bắt buộc căn Phải (Align Right)** để hàng đơn vị, hàng chục, hàng nghìn thẳng hàng dọc, giúp đối chiếu số liệu không bị lệch mắt.
    - Áp dụng zebra striping (màu dòng chẵn/lẻ xen kẽ nhẹ nhàng) và hiệu ứng hover làm nổi bật dòng hiện tại để mắt người dự toán không bị nhảy dòng khi duyệt bảng rộng.
*   **WR-16 (Typography & Tabular Numbers - Quy chuẩn Phông chữ Dự toán)**:
    - Sử dụng **Inter** cho văn bản chi tiết/bảng biểu và **Montserrat** cho các tiêu đề/số tiền lớn (Montserrat thay thế Outfit để hiển thị chuẩn tiếng Việt).
    - **Bắt buộc**: Sử dụng thuộc tính CSS `font-variant-numeric: tabular-nums;` cho toàn bộ các ô hiển thị số liệu và ô nhập đơn giá. Thuộc tính này ép mọi chữ số (từ số 1 thanh mảnh đến số 8 tròn trịa) có độ rộng ngang bằng nhau, giúp các con số căn hàng dọc thẳng tắp tuyệt đối như trong Excel, ngăn chặn hoàn toàn hiện tượng lệch hàng gây nhầm lẫn chữ số.
    - Giới hạn cỡ chữ nhỏ nhất là `12px` (cho ghi chú phụ) để bảo vệ thị lực người dùng.
*   **WR-17 (Tránh mồ côi chữ - No Single-Word Line Wrap / No Orphans)**:
    - Tuyệt đối không để xảy ra hiện tượng mồ côi chữ (chữ cuối cùng của một câu hoặc một nhãn văn bản bị xuống dòng lẻ loi một mình, ví dụ: "Chưa có hạng mục nào được\nthêm").
    - Đối với các văn bản hiển thị trên UI, phải sử dụng các giải pháp như:
      - Sử dụng ký tự khoảng trắng không ngắt (`&nbsp;`) giữa hai từ cuối cùng của câu/đoạn (ví dụ: `được&nbsp;thêm`, `tổng&nbsp;hợp&nbsp;BOQ`).
      - Áp dụng CSS `white-space: nowrap;` cho các phần tử chứa nhãn ngắn, các nút (`.btn`), thẻ điều hướng (`.tab-btn`), các ô số liệu kèm đơn vị (như `.main-value`).
      - Đảm bảo layout được thiết kế có khoảng đệm co giãn tốt hoặc `min-width` phù hợp để tránh co hẹp chữ.
