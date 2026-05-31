# Quy tắc Thiết kế & Phát triển Đa nền tảng (Desktop & Mobile Rules)

Tài liệu này định nghĩa các quy tắc bắt buộc áp dụng cho quá trình thiết kế, lập trình và tối ưu hóa giao diện đa nền tảng (Desktop, Tablet, Mobile) đối với công cụ MECALC tại Workspace `g:\.AIWork\.anlaa-tools`.

---

## 1. Ngưỡng Responsive (CSS Breakpoints)

Để đảm bảo hiển thị mượt mà trên mọi kích thước màn hình, hệ thống bắt buộc phải chia thành 3 ngưỡng Viewport chính:

*   **Mobile (Màn hình dọc điện thoại)**: Viewport $< 768\text{ px}$.
    - Giao diện chuyển thành dạng 1 cột dọc (Single Column layout).
    - Sidebar ẩn đi và kích hoạt chế độ Drawer mờ ảo (Off-canvas sidebar).
*   **Tablet (Máy tính bảng / Màn hình ngang nhỏ)**: $768\text{ px} \le \text{Viewport} < 1200\text{ px}$.
    - Giao diện có thể co giãn, sidebar thu nhỏ thành icon gọn gàng hoặc dạng trượt.
*   **Desktop (Màn hình máy tính lớn)**: Viewport $\ge 1200\text{ px}$.
    - Giao diện hiển thị cố định 2 cột song song (Sidebar 280px cố định bên trái, Workspace bên phải).

---

## 2. Quy chuẩn Tương tác trên Thiết bị Di động (Touch & Mobile Rules)

*   **WR-DM-1 (Touch Target Size - Kích thước vùng chạm)**:
    - Toàn bộ các phần tử tương tác (nút bấm `.btn`, thẻ tab, icon xóa, ô check, select...) trên màn hình di động phải đạt kích thước chạm tối thiểu là $44 \times 44\text{ px}$ (theo khuyến nghị của Apple và Google).
    - Khoảng cách an toàn (margin/padding) giữa các vùng chạm tối thiểu là $8\text{ px}$ để ngăn chặn hoàn toàn việc bấm nhầm chéo.
*   **WR-DM-2 (Mobile Input Optimization - Bàn phím số tự động)**:
    - Mọi ô nhập số liệu (chiều dài, chiều cao, diện tích, hao hụt, đơn giá...) trên Mobile **bắt buộc** phải trang bị thuộc tính `inputmode="decimal"` hoặc `type="number"`.
    - Điều này giúp hệ điều hành di động (iOS/Android) lập tức kích hoạt bàn phím số (Numpad) chuyên dụng thay vì bàn phím chữ, giúp tăng tốc độ nhập liệu lên 300%.
*   **WR-DM-3 (Viewport Zoom Prevention - Chống phóng to cưỡng bức)**:
    - Cấm sử dụng tính năng tự động phóng to màn hình khi focus vào các ô nhập liệu trên Safari iOS. Để đạt được điều này, cỡ chữ của toàn bộ thẻ `<input>` và `<select>` trên mobile phải có kích thước tối thiểu là $16\text{ px}$ (`font-size: 16px` ở media query di động), tránh trình duyệt kích hoạt tính năng zoom làm hỏng bố cục.
*   **WR-DM-4 (Drawer Sidebar & Backdrop - Trượt Sidebar di động)**:
    - Khi sidebar hoạt động trên mobile, nó phải trượt từ bên trái sang với hiệu ứng transition mượt mà và che phủ lên trên nội dung.
    - **Bắt buộc**: Phải có một lớp overlay che phủ mờ ảo (Backdrop blur overlay) và một nút đóng (`#sidebarClose`) có biểu tượng chữ X lớn rõ ràng để người dùng đóng menu dễ dàng.
    - Vùng body nền bên dưới sidebar phải bị khóa scroll (`overflow: hidden`) khi sidebar đang mở.

---

## 3. Quy chuẩn Hiển thị trên Máy tính (Desktop Rules)

*   **WR-DK-1 (Keyboard-First Navigation)**:
    - Thiết lập thuộc tính `tabindex` tuần tự khoa học trên toàn bộ các ô nhập dữ liệu thô. Người dự toán có thể điền thông tin nhanh từ ô này sang ô khác bằng phím `Tab` và `Shift + Tab` mà không cần chạm vào chuột.
    - Duy trì cơ chế bôi đen tự động khi focus (`this.select()`) cho cả các trường dữ liệu sinh động bằng JS.
*   **WR-DK-2 (Hover Micro-interactions)**:
    - Toàn bộ các nút bấm và thẻ tab trên Desktop phải có hiệu ứng micro-animations nhẹ nhàng khi hover (ví dụ: chuyển màu mượt mà, scale nhẹ 1.02x, tăng độ bóng neon).
*   **WR-DK-3 (Table Header Pinning - Cố định tiêu đề)**:
    - Đối với các bảng dữ liệu dài (như bảng BOQ, bảng dự toán thi công G8), tiêu đề bảng (`<thead>`) phải được cố định khi cuộn (`position: sticky; top: 0; z-index: 5;`) để người dự toán luôn đối chiếu được cột số liệu tương ứng mà không cần cuộn ngược lên trên.

---

## 4. Ghi nhật ký & Đồng bộ đa thiết bị

*   **WR-DM-DK-1**: Mọi thay đổi về đơn giá, dự án hoặc hành động in ấn từ cả hai nền tảng phải được đồng bộ chính xác vào `localStorage` và ghi nhật ký hoạt động vào tệp `02_Process/audit_log/audit.log` với thẻ phân biệt thiết bị nếu có.

---

> [!NOTE]
> *Quy tắc này áp dụng bắt buộc từ ngày 31/05/2026. Mọi Agent và nhà phát triển phải tuân thủ nghiêm ngặt.*
