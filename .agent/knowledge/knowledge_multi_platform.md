# Kiến thức Thiết kế & Tối ưu hóa Đa Nền tảng (Multi-Platform Knowledge Base)

Tài liệu này cung cấp các kiến thức kỹ thuật chuyên sâu về tối ưu hóa hiệu năng, trải nghiệm người dùng và thiết kế Responsive cho công cụ MECALC trên hai nền tảng Desktop và Mobile.

---

## 1. Thiết kế Glassmorphism trên Thiết bị Di động (Mobile Performance)

Phong cách thiết kế Glassmorphism (giao diện kính mờ) mang lại trải nghiệm thị giác cực kỳ cao cấp nhưng lại là một thách thức lớn đối với hiệu năng phần cứng trên các thiết bị di động tầm trung hoặc cũ.

### A. Cơ chế Render của Browser đối với Backdrop Blur
Khi sử dụng thuộc tính CSS `backdrop-filter: blur(12px);`, trình duyệt phải thực hiện quá trình render phức tạp:
1. Chụp lại vùng nội dung nằm phía sau phần tử (Layer rasterization).
2. Áp dụng bộ lọc làm mờ Gauss (Gaussian blur) trên vùng ảnh chụp đó bằng GPU/CPU.
3. Vẽ đè phần tử kính lên trên kèm theo màu phủ `rgba()`.
Quá trình này diễn ra liên tục mỗi khi người dùng cuộn trang (`scroll`) hoặc có các hiệu ứng chuyển động, gây ra hiện tượng tụt khung hình (FPS drop) nghiêm trọng trên di động.

### B. Giải pháp Tối ưu hóa Hiệu năng di động
Để duy trì giao diện mượt mà 60 FPS trên mobile, lập trình viên cần áp dụng các biện pháp sau:
- **Giảm độ sâu mờ (Blur Radius)**: Giảm từ `blur(16px)` xuống `blur(8px)` hoặc `blur(6px)` trên mobile. Mắt người vẫn cảm nhận được độ kính mờ nhưng GPU sẽ tính toán nhẹ hơn gấp 4 lần.
- **Tăng độ mờ đục của nền (Opacity)**: Tăng giá trị anpha của màu phủ từ `rgba(22, 25, 37, 0.4)` lên `rgba(22, 25, 37, 0.8)`. Nền đục hơn sẽ giúp trình duyệt giảm bớt độ phức tạp khi pha trộn màu sắc các pixel phía sau.
- **Sử dụng `will-change` hợp lý**: Áp dụng thuộc tính `will-change: transform, opacity;` cho các sidebar trượt hoặc popup để trình duyệt tạo một layer riêng trên GPU, tránh render lại toàn bộ trang (Repaint).

---

## 2. Giải pháp Hiển thị Bảng Dữ liệu Lớn trên Màn hình Điện thoại

Các bảng dữ liệu lớn như Bill of Quantities (BOQ) hay bảng dự toán chi tiết kiểu G8 có rất nhiều cột số liệu (Dài, Cao, Số lượng, Định mức, Đơn giá, Thành tiền) rất khó hiển thị vừa vặn trên màn hình dọc điện thoại ($320\text{ px} - 480\text{ px}$).

Chúng tôi đề xuất 3 mô hình xử lý hiệu quả:

```
┌──────────────────────────────────────────────────────────┐
│   MÔ HÌNH 1: SCROLL NGANG (Mặc định đơn giản)           │
│   [STT] [ Hạng mục ] [KL] -> [ Đơn vị ] [Đơn giá] [Thành tiền]│
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│   MÔ HÌNH 2: WRAP CỘT & ẨN PHỤ (Tối ưu thiết kế)        │
│   [ Hạng mục trát ]                                      │
│   KL: 12,50 m²   |  Đơn giá: 65.000 đ                    │
│   Thành tiền: 812.500 VNĐ                                │
└──────────────────────────────────────────────────────────┘
```

### Chi tiết các mô hình:
1.  **Mô hình 1: Horizontal Scroll (Cuộn ngang tự do)**
    - *Cách làm*: Bao bọc bảng bằng một thẻ `div` có CSS: `width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;`.
    - *Ưu điểm*: Giữ nguyên cấu trúc bảng dọc Excel quen thuộc, dễ lập trình.
    - *Nhược điểm*: Kỹ sư phải vuốt ngang liên tục để xem hết số liệu, dễ bị lệch hàng mắt.
2.  **Mô hình 2: Adaptive Hidden (Ẩn cột phụ theo độ ưu tiên)**
    - *Cách làm*: Sử dụng CSS Media Queries ẩn bớt các cột ít quan trọng trên mobile (ví dụ: ẩn cột STT, cột Thể tích lý thuyết) và chỉ giữ lại 3 cột cốt lõi: Tên hạng mục, Khối lượng, và Thành tiền.
3.  **Mô hình 3: Card-based Layout (Chuyển đổi sang thẻ Card di động)**
    - *Cách làm*: Trên mobile, sử dụng CSS để chuyển cấu trúc bảng `display: table;` thành các thẻ khối `display: block;`. Mỗi dòng của bảng trở thành một hộp kính mờ (card).
    - *Ưu điểm*: Hiển thị tuyệt đẹp trên màn hình dọc, thông tin bố trí khoa học dạng nhãn-giá trị xếp chồng.

---

## 3. Tối ưu hóa Viewport & Chống Zoom tự động trên iOS Safari

Một lỗi UI cực kỳ khó chịu trên di động là trình duyệt Safari trên iPhone tự động phóng to màn hình (Zoom-in) mỗi khi người dùng nhấp vào một ô `<input>` hoặc `<select>`. Điều này làm lệch toàn bộ layout Glassmorphism và người dùng phải dùng hai ngón tay để thu nhỏ lại.

### Nguyên nhân & Cách khắc phục
- **Nguyên nhân**: Safari iOS sẽ tự động phóng to màn hình nếu kích thước phông chữ của ô input được focus nhỏ hơn $16\text{ px}$.
- **Giải pháp**: Thiết lập CSS bắt buộc cho di động:
  ```css
  @media (max-width: 767px) {
      input[type="number"],
      input[type="text"],
      select,
      textarea {
          font-size: 16px !important; /* Đảm bảo >= 16px để chặn Safari tự động zoom */
      }
  }
  ```

---

> [!TIP]
> *Áp dụng đúng các kiến thức trên sẽ giúp sản phẩm MECALC đạt được hiệu năng tối đa và trải nghiệm người dùng cực kỳ premium trên mọi dòng máy.*
