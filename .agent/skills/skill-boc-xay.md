# Kỹ năng: Bóc khối lượng Xây tường (Skill — Masonry Estimation)

Tài liệu này đặc tả quy trình nghiệp vụ bóc tách khối lượng vật tư công tác xây tường gạch đỏ đặc và gạch rỗng 2 lỗ theo tiêu chuẩn miền Bắc ($6.5 \times 10.5 \times 22\text{ cm}$).

---

## 1. Quy trình Thu thập và Chuẩn hóa Đầu vào

Khi thực hiện bóc khối lượng xây tường cho một hạng mục/phòng, bắt buộc phải thu thập đầy đủ các thông số sau:
1.  **Chiều dài tường ($L$ - mét)**: Chiều dài thông thủy của bức tường cần xây mới hoặc sửa chữa.
2.  **Chiều cao tường ($H$ - mét)**: Chiều cao xây từ mặt sàn hoàn thiện đến đáy dầm hoặc đáy trần bê tông.
3.  **Số lượng bức tường ($N$)**: Số bức tường có cùng kích thước hình học.
4.  **Hạng mục cửa mở (Cửa đi, Cửa sổ)**:
    - Chiều rộng cửa ($W_c$ - mét).
    - Chiều cao cửa ($H_c$ - mét).
    - Số lượng cửa ($N_c$).
5.  **Loại tường xây**:
    - **Tường 110** (độ dày tính toán $0.11\text{ m}$).
    - **Tường 220** (độ dày tính toán $0.22\text{ m}$).
6.  **Loại gạch**: Gạch đặc đỏ hoặc Gạch rỗng 2 lỗ (kích thước chuẩn $6.5 \times 10.5 \times 22\text{ cm}$).
7.  **Mác vữa xây**: M50, M75, hoặc M100 (sử dụng xi măng PC40 và cát mịn).
8.  **Hệ số hao hụt gạch ($WF_g$ - %)** và **Hao hụt cát/xi ($WF_v$ - %)**: Mặc định là $3\%$ cho gạch và $8\%$ cho vữa xây cát/xi măng.

---

## 2. Công thức Tính toán Hình học & Thể tích

Quy trình bóc tách tính toán được thực hiện tuần tự như sau:

### Bước 2.1: Tính diện tích tường thô (Gross Wall Area)
$$S_{\text{thô}} = L \times H \times N \quad (\text{m}^2)$$

### Bước 2.2: Tính diện tích chiếm chỗ của cửa (Opening Deductions)
$$S_{\text{cửa}} = \sum (W_c \times H_c \times N_c) \quad (\text{m}^2)$$

### Bước 2.3: Tính diện tích xây thực tế (Net Wall Area)
$$S_{\text{xây}} = S_{\text{thô}} - S_{\text{cửa}} \quad (\text{m}^2)$$
> [!WARNING]
> Nếu diện tích xây thực tế $S_{\text{xây}} \le 0$, hệ thống phải báo lỗi nhập liệu hình học không hợp lệ.

### Bước 2.4: Tính thể tích tường xây ($V_{\text{tường}}$ - m³)
$$V_{\text{tường}} = S_{\text{xây}} \times D \quad (\text{m}^3)$$
*(Trong đó: $D = 0.11$ đối với Tường 110, và $D = 0.22$ đối với Tường 220).*

---

## 3. Quy trình Tính toán Vật tư Chi tiết

Từ thể tích tường xây $V_{\text{tường}}$, tiến hành bóc tách định mức vật tư:

### Bước 3.1: Tính số lượng gạch cần mua ($Q_{\text{gạch}}$ - viên)
$$Q_{\text{gạch}} = V_{\text{tường}} \times D_{\text{gạch}} \times (1 + WF_g)$$
*   **Định mức $D_{\text{gạch}}$**:
    - Đối với Tường 110: $550$ viên/$\text{m}^3$.
    - Đối với Tường 220: $540$ viên/$\text{m}^3$.
*   *Lưu ý*: Kết quả $Q_{\text{gạch}}$ phải được làm tròn lên thành số nguyên (ví dụ: $617.4 \rightarrow 618$ viên).

### Bước 3.2: Tính thể tích vữa xây cần trộn ($V_{\text{vữa}}$ - m³)
$$V_{\text{vữa}} = V_{\text{tường}} \times D_{\text{vữa}}$$
*   **Định mức vữa xây $D_{\text{vữa}}$**:
    - Đối với Tường 110: $0.23\text{ m}^3$ vữa/$\text{m}^3$ xây.
    - Đối với Tường 220: $0.23\text{ m}^3$ vữa/$\text{m}^3$ xây.

### Bước 3.3: Phân rã vật liệu cát, xi măng, nước từ thể tích vữa $V_{\text{vữa}}$
Sử dụng các hằng số cấp phối vữa theo mác được chọn ($C_{\text{xi}}$, $C_{\text{cát}}$, $C_{\text{nước}}$ cho $1\text{ m}^3$ vữa):
*   **Xi măng cần mua ($Q_{\text{xi}}$ - kg)**:
    $$Q_{\text{xi}} = V_{\text{vữa}} \times C_{\text{xi}} \times (1 + WF_v)$$
    *Quy đổi ra số bao 50kg*: $N_{\text{bao xi}} = \text{ceil}(Q_{\text{xi}} / 50)$.
*   **Cát xây cần mua ($Q_{\text{cát}}$ - m³)**:
    $$Q_{\text{cát}} = V_{\text{vữa}} \times C_{\text{cát}} \times (1 + WF_v)$$
*   **Nước sạch cần dùng ($Q_{\text{nước}}$ - lít)**:
    $$Q_{\text{nước}} = V_{\text{vữa}} \times C_{\text{nước}} \times (1 + WF_v)$$
