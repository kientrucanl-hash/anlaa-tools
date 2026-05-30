# Kỹ năng: Bóc khối lượng Trát tường (Skill — Plastering Estimation)

Tài liệu này đặc tả quy trình nghiệp vụ bóc tách khối lượng vật tư công tác trát tường (tô tường) cải tạo nhà ở, chung cư sử dụng vữa xi măng cát mịn (Mác M50, M75, M100).

---

## 1. Quy trình Thu thập và Chuẩn hóa Đầu vào

Khi thực hiện bóc khối lượng trát tường, bắt buộc phải thu thập đầy đủ các thông số sau:
1.  **Diện tích bề mặt trát ($S$ - mét vuông)**: Diện tích thực tế cần trát phẳng.
2.  **Số mặt trát ($M_{\text{mặt}}$)**:
    - Trát 1 mặt (thường là tường giáp nhà hàng xóm, hoặc vách ngăn trong căn hộ).
    - Trát 2 mặt (tường xây ngăn phòng thông thường).
3.  **Độ dày lớp trát ($T$ - cm)**:
    - Trát dày $1.5\text{ cm}$ (tiêu chuẩn trát trong nhà phẳng).
    - Trát dày $2.0\text{ cm}$ (trát ngoài trời chống thấm, hoặc tường cũ lồi lõm nhiều cần bù phẳng).
4.  **Mác vữa trát**: M50, M75, hoặc M100 (thông dụng nhất là mác M75 dùng cát mịn).
5.  **Hệ số hao hụt cát/xi măng trát ($WF_v$ - %)**: Mặc định là $8\%$ (trát cải tạo rơi vãi vữa nhiều hơn xây).

---

## 2. Công thức Tính toán Thể tích Vữa Trát

Quy trình bóc tách thể tích vữa được thực hiện tuần tự như sau:

### Bước 2.1: Tính tổng diện tích bề mặt trát thực tế ($S_{\text{trát}}$ - m²)
$$S_{\text{trát}} = S \times M_{\text{mặt}} \quad (\text{m}^2)$$

### Bước 2.2: Xác định thể tích vữa trát lý thuyết trên mỗi $1\text{ m}^2$ ($V_{\text{định mức}}$ - m³)
Dựa trên độ dày lớp trát được chọn:
*   Nếu lớp trát dày $1.5\text{ cm}$ ($0.015\text{ m}$):
    $$V_{\text{định mức}} = 0.017 \quad (\text{m}^3 \text{ vữa}/1\text{ m}^2)$$
    *(Đã bao gồm độ bù hao phí khe gạch rỗng).*
*   Nếu lớp trát dày $2.0\text{ cm}$ ($0.020\text{ m}$):
    $$V_{\text{định mức}} = 0.023 \quad (\text{m}^3 \text{ vữa}/1\text{ m}^2)$$

### Bước 2.3: Tính tổng thể tích vữa trát cần trộn ($V_{\text{vữa\_trát}}$ - m³)
$$V_{\text{vữa\_trát}} = S_{\text{trát}} \times V_{\text{định mức}} \quad (\text{m}^3)$$

---

## 3. Quy trình Tính toán Vật tư Trát tường Chi tiết

Từ tổng thể tích vữa trát $V_{\text{vữa\_trát}}$, tiến hành tách khối lượng vật liệu cát mịn và xi măng PC40 cần mua:

### Bước 3.1: Tính khối lượng xi măng cần mua ($Q_{\text{xi}}$ - kg)
$$Q_{\text{xi}} = V_{\text{vữa\_trát}} \times C_{\text{xi}} \times (1 + WF_v)$$
*   **Hằng số cấp phối xi măng $C_{\text{xi}}$** (theo mác vữa đã chọn):
    - Mác M50: $230\text{ kg}/\text{m}^3$ vữa.
    - Mác M75: $320\text{ kg}/\text{m}^3$ vữa.
    - Mác M100: $415\text{ kg}/\text{m}^3$ vữa.
*   *Quy đổi ra số bao 50kg*: $N_{\text{bao xi}} = \text{ceil}(Q_{\text{xi}} / 50)$ (Làm tròn lên số nguyên gần nhất).

### Bước 3.2: Tính thể tích cát mịn cần mua ($Q_{\text{cát}}$ - m³)
$$Q_{\text{cát}} = V_{\text{vữa\_trát}} \times C_{\text{cát}} \times (1 + WF_v)$$
*   **Hằng số cấp phối cát mịn $C_{\text{cát}}$**:
    - Mác M50: $1.12\text{ m}^3/\text{m}^3$ vữa.
    - Mác M75: $1.09\text{ m}^3/\text{m}^3$ vữa.
    - Mác M100: $1.06\text{ m}^3/\text{m}^3$ vữa.

### Bước 3.3: Tính lượng nước sạch cần dùng ($Q_{\text{nước}}$ - lít)
$$Q_{\text{nước}} = V_{\text{vữa\_trát}} \times C_{\text{nước}} \times (1 + WF_v)$$
*   **Hằng số cấp phối nước $C_{\text{nước}}$**:
    - Mác M50: $250\text{ lít}/\text{m}^3$ vữa.
    - Mác M75: $260\text{ lít}/\text{m}^3$ vữa.
    - Mác M100: $268\text{ lít}/\text{m}^3$ vữa.
