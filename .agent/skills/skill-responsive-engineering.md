# Kỹ năng: Lập trình Responsive & Tối ưu hóa Thiết bị (Responsive Engineering & Mobile Gestures)

Tài liệu này đặc tả kỹ năng lập trình giao diện thích ứng (Responsive Layouts), xử lý các sự kiện chạm vuốt (Touch Events), tối ưu hóa biểu đồ và tối ưu CSS cho cả hai nền tảng Desktop và Mobile.

---

## 1. Xử lý Sự kiện Chạm Vuốt (Mobile Touch & Swipe Gestures)

Để mang lại trải nghiệm premium trên di động, hệ thống hỗ trợ đóng mở Sidebar bằng cử chỉ vuốt ngang (Swipe left/right) mượt mà như ứng dụng native.

### Thuật toán bắt cử chỉ Swipe bằng Javascript
```javascript
let touchStartX = 0;
let touchEndX = 0;
const SWIPE_THRESHOLD = 80; // Khoảng cách vuốt tối thiểu (px) để nhận diện

function handleGesture() {
    const sidebar = document.getElementById("appSidebar");
    const overlay = document.getElementById("sidebarOverlay");
    if (!sidebar || !overlay) return;

    const diffX = touchEndX - touchStartX;
    
    // Vuốt từ trái sang phải (diffX > 0) -> Mở Sidebar
    if (diffX > SWIPE_THRESHOLD && touchStartX < 50) { // touchStartX < 50 để chỉ bắt vuốt từ rìa màn hình
        sidebar.classList.add("active");
        overlay.classList.add("active");
    }
    
    // Vuốt từ phải sang trái (diffX < 0) -> Đóng Sidebar
    if (diffX < -SWIPE_THRESHOLD && sidebar.classList.contains("active")) {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
    }
}

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
}, false);

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleGesture();
}, false);
```

---

## 2. Lập trình Bố cục linh hoạt (Fluid Layouts) không lạm dụng Media Queries

Thay vì viết hàng trăm dòng code `@media` riêng lẻ, kỹ sư ưu tiên áp dụng các thuộc tính CSS hiện đại để layout tự co giãn linh hoạt:

### A. CSS Grid Flexible Columns
Tự động tính toán số cột của bảng Đơn giá hoặc thẻ Card vật tư dựa trên độ rộng màn hình thực tế:
```css
.grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
}
```
- Khi màn hình rộng (Desktop): Tự động dàn thành 3-4 cột song song.
- Khi màn hình hẹp (Mobile): Tự co lại thành 1 cột dọc mà không cần viết media query.

### B. Hàm `clamp()` cho Responsive Typography
Điều chỉnh cỡ chữ tiêu đề mượt mà từ Mobile lên Desktop:
```css
h2 {
    font-size: clamp(1.3rem, 2.5vw, 2rem);
}
```
- Kích thước chữ sẽ tự động co giãn tuyến tính theo độ rộng viewport (`2.5vw`) nhưng luôn bị giới hạn trong khoảng từ `1.3rem` (cho mobile) đến `2rem` (cho máy tính lớn), ngăn chặn chữ bị quá to hoặc quá nhỏ.

---

## 3. Tối ưu hóa Biểu đồ Co giãn mượt mà (Responsive Chart.js)

Khi người dùng xoay ngang điện thoại hoặc thay đổi kích thước cửa sổ trình duyệt trên máy tính, biểu đồ phân tích chi phí BOQ cần phải co giãn theo một cách mượt mà và không bị méo.

### Quy trình cấu hình Chart.js Responsive
1.  **Bao bọc canvas bằng Container có vị trí tương đối**:
    ```html
    <div class="chart-container" style="position: relative; height:300px; width:100%">
        <canvas id="costAnalysisChart"></canvas>
    </div>
    ```
2.  **Thiết lập các tùy chọn co giãn trong Javascript**:
    ```javascript
    const config = {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false, // Ép biểu đồ tuân thủ chiều cao của container thay vì tỷ lệ khung hình cố định
            plugins: {
                legend: {
                    position: window.innerWidth < 768 ? 'bottom' : 'right', // Tự động di chuyển chú thích xuống dưới trên di động
                }
            }
        }
    };
    ```

---

> [!TIP]
> *Việc thành thạo các kỹ năng lập trình trên sẽ đảm bảo mã nguồn MECALC hoạt động trơn tru, tiêu tốn ít tài nguyên phần cứng và hiển thị hoàn hảo trên mọi thiết bị.*
