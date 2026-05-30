# Kỹ năng: Bóc khối lượng Ốp lát bằng Keo (Skill — Tiling Estimation)

Tài liệu này đặc tả quy trình nghiệp vụ bóc tách khối lượng gạch, keo dán gạch, keo chà ron, ke cân bằng và ke chữ thập dựa trên diện tích bề mặt và kích thước gạch ốp lát.

---

## 1. Quy trình Thu thập và Chuẩn hóa Đầu vào

Khi thực hiện bóc khối lượng ốp lát, bắt buộc phải thu thập đầy đủ các thông số sau:
1.  **Diện tích bề mặt ốp lát ($S_{\text{ốp\_lát}}$ - m²)**: Diện tích sàn cần lát hoặc tường cần ốp gạch.
2.  **Kích thước gạch ($W_{\text{gạch}} \times L_{\text{gạch}}$ - cm)**: Các kích thước phổ biến:
    - $30 \times 30$, $40 \times 40$, $30 \times 60$, $60 \times 60$, $80 \times 80$, $60 \times 120\text{ cm}$.
3.  **Chiều dày viên gạch ($T_{\text{gạch}}$ - mm)**: Chiều dày thực tế của gạch (phục vụ tính keo chà ron).
4.  **Độ rộng ron gạch ($W_{\text{ron}}$ - mm)**: Khoảng hở mạch gạch (thường dùng $1.5\text{ mm}$ hoặc $2.0\text{ mm}$).
5.  **Phương pháp thi công**:
    - **Keo nguyên chất**: Dán gạch bằng keo dán gạch chuyên dụng nguyên chất.
    - **Hỗn hợp Keo dán gạch trộn Xi măng**: Trộn keo dán gạch với xi măng truyền thống theo tỷ lệ khối lượng.
6.  **Tỷ lệ trộn (nếu dùng hỗn hợp)**: $1:1$ (mặc định), $2:1$ hoặc $1:2$ (Keo : Xi măng).
7.  **Hệ số hao hụt gạch ($WF_g$ - %)**, **Hao hụt keo ($WF_k$ - %)** và **Hao hụt chà ron ($WF_r$ - %)**: Mặc định gạch: $5\%$, keo/ron: $5\%$.

---

## 2. Công thức Tính toán Số lượng Gạch & Diện tích Đóng hộp

### Bước 2.1: Tính diện tích của một viên gạch lý thuyết ($S_{\text{viên}}$ - m²)
$$S_{\text{viên}} = \frac{W_{\text{gạch}}}{100} \times \frac{L_{\text{gạch}}}{100} \quad (\text{m}^2)$$

### Bước 2.2: Tính số viên gạch cần mua lý thuyết ($Q_{\text{viên}}$ - viên)
$$Q_{\text{viên}} = \text{ceil}\left( \frac{S_{\text{ốp\_lát}}}{S_{\text{viên}}} \times (1 + WF_g) \right)$$
*(Bắt buộc phải làm tròn lên thành số nguyên để mua nguyên viên gạch).*

### Bước 2.3: Tính số lượng hộp gạch cần mua thương mại ($N_{\text{hộp}}$)
Thông thường, gạch được bán theo quy cách đóng hộp vuông. Số lượng viên trong 1 hộp được định nghĩa như sau:
*   Gạch $30x30\text{ cm}$: 11 viên/hộp ($\approx 0.99\text{ m}^2$).
*   Gạch $40x40\text{ cm}$: 6 viên/hộp ($\approx 0.96\text{ m}^2$).
*   Gạch $30x60\text{ cm}$: 8 viên/hộp ($\approx 1.44\text{ m}^2$).
*   Gạch $60x60\text{ cm}$: 4 viên/hộp ($\approx 1.44\text{ m}^2$).
*   Gạch $80x80\text{ cm}$: 3 viên/hộp ($\approx 1.92\text{ m}^2$).
*   Gạch $60x120\text{ cm}$: 2 viên/hộp ($\approx 1.44\text{ m}^2$).

$$N_{\text{hộp}} = \text{ceil}(Q_{\text{viên}} / \text{Số viên trên hộp})$$

---

## 3. Quy trình Tính Keo dán gạch & Quy đổi Đóng bao

Dựa trên phương pháp thi công được chọn:

### Trường hợp A: Sử dụng Keo nguyên chất
*   **Tổng khối lượng keo cần dùng ($Q_{\text{keo}}$ - kg)**:
    $$Q_{\text{keo}} = S_{\text{ốp\_lát}} \times D_{\text{keo}} \times (1 + WF_k)$$
    *Trong đó định mức keo $D_{\text{keo}}$*:
    - Nếu kích thước gạch $\le 60x60\text{ cm}$: $D_{\text{keo}} = 5.0\text{ kg}/\text{m}^2$.
    - Nếu kích thước gạch $> 60x60\text{ cm}$ (80x80, 60x120): $D_{\text{keo}} = 6.0\text{ kg}/\text{m}^2$.
*   *Quy đổi ra số bao keo 25kg*: $N_{\text{bao keo}} = \text{ceil}(Q_{\text{keo}} / 25)$.

### Trường hợp B: Sử dụng Hỗn hợp Keo trộn Xi măng
*   **Tổng khối lượng hỗn hợp khô cần dùng ($Q_{\text{hỗn\_hợp}}$ - kg)**:
    $$Q_{\text{hỗn\_hợp}} = S_{\text{ốp\_lát}} \times D_{\text{hỗn\_hợp}} \times (1 + WF_k)$$
    *(Với định mức hỗn hợp khô mặc định $D_{\text{hỗn\_hợp}} = 7.0\text{ kg}/\text{m}^2$)*.
*   **Phân tách khối lượng Keo và Xi măng theo Tỷ lệ khối lượng**:
    Gọi tỷ lệ trộn là $R_{\text{keo}} : R_{\text{xi}}$ (ví dụ tỷ lệ 1:1, thì phần keo chiếm $50\%$, xi măng chiếm $50\%$):
    - Khối lượng keo dán gạch ($Q_{\text{keo\_trộn}}$ - kg):
      $$Q_{\text{keo\_trộn}} = Q_{\text{hỗn\_hợp}} \times \frac{R_{\text{keo}}}{R_{\text{keo}} + R_{\text{xi}}}$$
      *Quy đổi bao 25kg*: $N_{\text{bao keo}} = \text{ceil}(Q_{\text{keo\_trộn}} / 25)$.
    - Khối lượng xi măng trộn ($Q_{\text{xi\_trộn}}$ - kg):
      $$Q_{\text{xi\_trộn}} = Q_{\text{hỗn\_hợp}} \times \frac{R_{\text{xi}}}{R_{\text{keo}} + R_{\text{xi}}}$$
      *Quy đổi bao 50kg*: $N_{\text{bao xi}} = \text{ceil}(Q_{\text{xi\_trộn}} / 50)$.

---

## 4. Quy trình Tính toán Keo chà ron & Phụ kiện

### Bước 4.1: Tính khối lượng keo chà ron cần chít mạch ($Q_{\text{ron}}$ - kg)
Áp dụng công thức hình học:
$$Q_{\text{ron\_lý\_thuyết}} = \left( \frac{A + B}{A \times B} \right) \times C \times D \times 1.4 \quad (\text{kg}/\text{m}^2)$$
*(Trong đó: $A = W_{\text{gạch}} \times 10$ (mm), $B = L_{\text{gạch}} \times 10$ (mm), $C = T_{\text{gạch}}$ (mm), $D = W_{\text{ron}}$ (mm)).*

$$Q_{\text{ron}} = S_{\text{ốp\_lát}} \times Q_{\text{ron\_lý\_thuyết}} \times (1 + WF_r)$$

### Bước 4.2: Tính số lượng Phụ kiện ke chà ron
Dựa theo bảng tra định mức phụ kiện kích thước gạch (nhân với diện tích $S_{\text{ốp\_lát}}$):
*   **Ke chữ thập cần mua**: $N_{\text{chữ\_thập}} = \text{ceil}(S_{\text{ốp\_lát}} \times D_{\text{chữ\_thập}} \times 1.05)$ (cái).
*   **Ke cân bằng (clips) cần mua**: $N_{\text{clips}} = \text{ceil}(S_{\text{ốp\_lát}} \times D_{\text{clips}} \times 1.05)$ (cái).
*   **Nêm cân bằng (wedges) cần mua**: $N_{\text{wedges}} = \text{ceil}(S_{\text{ốp\_lát}} \times D_{\text{wedges}} \times 1.05)$ (cái).
