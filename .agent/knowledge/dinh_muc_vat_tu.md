# Cơ sở Tri thức Định mức Vật tư (Material Estimation Knowledge Base)

Tài liệu này tổng hợp toàn bộ các thông số định mức cấp phối, định mức hao phí vật liệu xây trát ốp lát chuẩn miền Bắc (Hà Nội), làm cơ sở dữ liệu chính xác cho thuật toán tính toán của Tool.

---

## 1. Định mức Công tác Xây tường (Masonry Work)

Áp dụng cho gạch kích thước tiêu chuẩn miền Bắc: **$6.5 \times 10.5 \times 22\text{ cm}$**.

### A. Hao phí gạch & vữa cho $1\text{ m}^3$ tường xây (TCVN & Thực tế thi công)

| Loại tường | Gạch đặc (viên/$1\text{ m}^3$) | Gạch 2 lỗ (viên/$1\text{ m}^3$) | Thể tích vữa xây ($m^3$/$1\text{ m}^3$ tường) |
| :--- | :--- | :--- | :--- |
| **Tường 110** (Tường đơn) | 550 | 550 | 0.23 |
| **Tường 220** (Tường đôi) | 540 | 540 | 0.23 |

### B. Quy đổi định mức trên $1\text{ m}^2$ tường xây (để tính toán nhanh)
*   **Tường 110** (Dày 110mm chưa trát $\rightarrow$ thể tích $0.11\text{ m}^3$/$1\text{ m}^2$):
    - Số gạch đặc/rỗng: $\approx 60$ viên/$1\text{ m}^2$.
    - Thể tích vữa: $\approx 0.0253\text{ m}^3$ vữa/$1\text{ m}^2$.
*   **Tường 220** (Dày 220mm chưa trát $\rightarrow$ thể tích $0.22\text{ m}^3$/$1\text{ m}^2$):
    - Số gạch đặc/rỗng: $\approx 120$ viên/$1\text{ m}^2$.
    - Thể tích vữa: $\approx 0.0506\text{ m}^3$ vữa/$1\text{ m}^2$.

---

## 2. Định mức Công tác Trát tường (Plastering Work)

Hao phí vữa trát cho $1\text{ m}^2$ bề mặt tường tùy theo chiều dày lớp trát (đã tính hao hụt thi công trát cải tạo):

*   **Lớp trát dày 1.5 cm**: $0.017\text{ m}^3$ vữa trát/$1\text{ m}^2$.
*   **Lớp trát dày 2.0 cm**: $0.023\text{ m}^3$ vữa trát/$1\text{ m}^2$.

---

## 3. Định mức Cấp phối Vữa Xi măng PC40 & Cát mịn
Cấp phối vật liệu để trộn ra **$1\text{ m}^3$ vữa xây/trát** (Theo Thông tư 12/2021/TT-BXD phụ lục VII):

| Mác vữa | Xi măng PC40 (kg) | Cát mịn (m³) | Nước sạch (lít) |
| :--- | :--- | :--- | :--- |
| **Mác 50 (M50)** | 230 | 1.12 | 250 |
| **Mác 75 (M75)** | 320 | 1.09 | 260 |
| **Mác 100 (M100)** | 415 | 1.06 | 268 |

---

## 4. Định mức Công tác Ốp lát bằng Keo & Phụ kiện

### A. Vật liệu dán gạch
*   **Keo dán gạch nguyên chất**:
    - Gạch kích thước nhỏ/trung bình ($\le 60x60\text{ cm}$): **$5.0\text{ kg}/\text{m}^2$** (lớp keo dày $\approx 3\text{ mm}$).
    - Gạch khổ lớn ($80x80$, $60x120\text{ cm}$): **$6.0\text{ kg}/\text{m}^2$** (lớp keo dày $\approx 4\text{ mm}$).
*   **Hỗn hợp Keo dán gạch trộn Xi măng (PC40)**:
    - Định mức hỗn hợp khô: **$7.0\text{ kg}/\text{m}^2$** (lớp vữa dán dày hơn, khoảng $4-6\text{ mm}$).
    - Tỷ lệ trộn (Khối lượng): **1 Keo : 1 Xi măng** (mặc định), **2 Keo : 1 Xi măng**, **1 Keo : 2 Xi măng**.
    - *Ví dụ tỷ lệ 1:1*: $1\text{ m}^2$ cần $3.5\text{ kg}$ Keo và $3.5\text{ kg}$ Xi măng.

### B. Keo chà ron (chít mạch)
Tính toán theo công thức kích thước hình học gạch:
$$\text{Keo chà ron } (\text{kg}/\text{m}^2) = \frac{\text{Dài} + \text{Rộng}}{\text{Dài} \times \text{Rộng}} \times \text{Dày} \times \text{Độ rộng ron} \times 1.4$$
*(Kích thước Dài, Rộng, Dày gạch đổi ra mm; Độ rộng ron mặc định từ 1.5 - 2.0 mm).*

### C. Định mức Ke chữ thập & Ke cân bằng (clips) + Nêm (wedges)
Hao phí phụ kiện trên $1\text{ m}^2$ diện tích ốp lát:

| Kích thước Gạch (cm) | Ke chữ thập (cái/m²) | Ke cân bằng - Clips (cái/m²) | Nêm cân bằng - Wedges (cái/m²) |
| :--- | :--- | :--- | :--- |
| **30 x 30** | 11 | 0 (Không dùng) | 0 |
| **40 x 40** | 7 | 0 (Không dùng) | 0 |
| **30 x 60** | 6 | 8 | 8 |
| **60 x 60** | 4 | 6 | 6 |
| **80 x 80** | 4 | 4 | 4 |
| **60 x 120** | 3 | 4 | 4 |

*(Lưu ý: Nêm cân bằng (Wedges) có thể tái sử dụng nhiều lần, tuy nhiên trong dự toán ban đầu vẫn tính đủ số lượng để mua đồng bộ).*

---

## 5. Hệ số Hao hụt Vật tư Mặc định (Waste Factors)
Dành riêng cho cải tạo nhà ở / căn hộ chung cư (hao hụt cao hơn xây mới do vận chuyển đứng và diện tích thi công nhỏ):

*   **Gạch xây (đỏ đặc/rỗng)**: **$3\%$** (gạch vỡ khi vận chuyển, cắt tỉa góc).
*   **Xi măng, Cát (Xây & Trát)**: **$8\%$** (rơi vãi khi trộn, tô trát tường).
*   **Gạch ốp lát**: **$5\%$** (cắt góc, cắt viền chân tường, vỡ hao hụt).
*   **Keo dán gạch / Xi măng dán**: **$5\%$** (bám dính dụng cụ, rơi vãi cốt nền).
*   **Keo chà ron / Phụ kiện ke**: **$5\%$** (hao hụt rơi vãi).
