# Kỹ năng: Lập dự toán & Quản lý Chi phí Cải tạo (Skill — Cost Estimation & BOQ Management)

Tài liệu này đặc tả quy trình lập bảng dự toán chi phí vật tư (Bill of Quantities - BOQ) cho công tác cải tạo nhà ở và chung cư, giúp chủ nhà và nhà thầu kiểm soát dòng tiền vật tư một cách tuyệt đối.

---

## 1. Phương pháp Quản lý Dự toán theo Phân khu (Phòng/Hạng mục)

Trong cải tạo nhà ở, việc tính toán vật tư theo kiểu gom chung toàn bộ nhà thường gây ra sai số lớn do các phòng có kết cấu, chiều cao trần và loại gạch hoàn thiện khác nhau. Quy trình lập dự toán bắt buộc phải chia nhỏ theo từng phân khu:

*   **Nguyên tắc phân chia**: Dự án cải tạo căn hộ chung cư sẽ được chia nhỏ thành các hạng mục độc lập:
    - *Phòng khách + Ăn*: Lát gạch khổ lớn (ví dụ 80x80cm), trát sơn sửa lại tường.
    - *Bếp*: Ốp lát gạch mosaic/gạch thẻ, xây bệ bếp, ốp tường bếp.
    - *Toilet 1, Toilet 2*: Ốp lát gạch chống trơn trượt 30x60cm hoặc 60x60cm, xây vách ngăn kính tắm.
    - *Phòng ngủ 1, Phòng ngủ 2*: Cải tạo xây/trát lại tường ngăn phòng.
*   **Cộng dồn thông minh (Smart Aggregation)**:
    - Mỗi phân khu khi được nhập số liệu và tính toán xong sẽ được nhấn "Thêm vào dự án".
    - Hệ thống lưu trữ mảng các hạng mục này vào bộ nhớ `localStorage`.
    - Khi hiển thị Bảng Tổng hợp BOQ, hệ thống tự động gom nhóm (Group) các vật tư cùng loại (ví dụ: Tổng xi măng PC40 từ phòng khách + bếp + toilet = tổng lượng cần mua toàn căn hộ) và cộng dồn lại.

---

## 2. Quản lý Đơn giá & Thuật toán tính Chi phí thời gian thực

Để cung cấp giá trị sử dụng cao nhất cho người dùng, công cụ bắt buộc phải tích hợp bảng đơn giá vật liệu địa phương (có thể cấu hình thay đổi linh hoạt):

### A. Danh mục vật liệu & Đơn giá mặc định (Hà Nội)

| Loại vật liệu | Quy cách thương mại | Đơn vị tính | Đơn giá mặc định tham khảo (VNĐ) |
| :--- | :--- | :--- | :--- |
| **Gạch đặc đỏ** | Viên | viên | `1.500 VNĐ` |
| **Gạch rỗng 2 lỗ** | Viên | viên | `1.400 VNĐ` |
| **Gạch AAC (bê tông nhẹ)** | Viên ($10 \times 20 \times 60\text{ cm}$) | viên | `22.000 VNĐ` |
| **Xi măng PC40** | Bao $50\text{ kg}$ | bao | `90.000 VNĐ` |
| **Cát mịn** | Mét khối | m³ | `280.000 VNĐ` |
| **Keo dán gạch** | Bao $25\text{ kg}$ | bao | `350.000 VNĐ` |
| **Keo chà ron** | Kilôgam | kg | `45.000 VNĐ` |
| **Ke chữ thập** | Túi 100 chiếc | túi | `15.000 VNĐ` |
| **Ke cân bằng (clips)** | Túi 100 chiếc | túi | `60.000 VNĐ` |
| **Nêm cân bằng (wedges)** | Túi 100 chiếc | túi | `50.000 VNĐ` |

### B. Công thức Tính toán Chi phí
Với mỗi hạng mục/vật tư, chi phí được tính toán tự động:
$$\text{Thành tiền} = \text{Khối lượng cần mua (thương mại)} \times \text{Đơn giá địa phương}$$
*   **Tổng chi phí dự toán toàn căn hộ**:
    $$\text{Tổng Chi phí BOQ} = \sum (\text{Thành tiền của từng loại vật tư})$$

---

## 3. Quy chuẩn trình bày Số tiền Tiếng Việt (Number & Currency Formats)

Tuân thủ nghiêm ngặt chuẩn định dạng tài chính Việt Nam (theo Global Rule §4):

*   **Hiển thị Số tiền**: Sử dụng dấu chấm `.` phân cách hàng nghìn và hậu tố `VNĐ` liền sau (ví dụ: `1.500.000 VNĐ`). Tuyệt đối không dùng dấu phẩy `,` cho phân cách nghìn ở đơn vị tiền tệ.
*   **Quy đổi số decimal (số lẻ)**: Dùng dấu phẩy `,` cho số thập phân lẻ (ví dụ: `3,14` hoặc `0,25 m³`).
*   **Quy đổi viết bằng chữ (Textual Currency)**:
    Khi xuất bản báo cáo in ấn BOQ, tổng giá trị hợp đồng/vật tư phải có dòng **"Viết bằng chữ:"** chuyển đổi số tiền thành chữ tiếng Việt đầy đủ và trang trọng (ví dụ: *"Một triệu năm trăm nghìn đồng"*).
    *Thuật toán đọc số tiền*: Phải được lập trình chính xác trong JS để chuyển đổi tự động tổng chi phí thành chữ.

---

## 4. Rủi ro Vận hành & Cảnh báo Quan trọng (§12a)

Báo cáo dự toán BOQ của Tool là công cụ tính toán tham khảo hỗ trợ kỹ sư và chủ nhà chuẩn bị vật tư. Do thực tế địa hình cải tạo nhà chung cư có nhiều biến động (vận chuyển thang máy chật hẹp làm rơi vãi nhiều, trần nhà cong lồi lõm, tay nghề thợ tô trát...), ở cuối trang hiển thị bảng tổng hợp BOQ và trang in PDF **bắt buộc phải hiển thị dòng khuyến cáo**:

> ⚠️ **KHUYẾN CÁO**: *Bảng khối lượng vật tư và dự toán chi phí này được tính toán dựa trên định mức tiêu chuẩn kết hợp với hệ số hao hụt cải tạo thực tế. Người sử dụng cần khảo sát thực tế cốt nền, độ phẳng tường cũ và trao đổi kỹ với đội ngũ thợ thi công để rà soát và điều chỉnh chính xác trước khi mua vật tư chính thức.*

---

## 5. Phân định Vai trò: Human-in-the-Loop vs AI-Automated

Quy trình bóc tách BOQ được chia rõ vai trò tương tác giữa Con người và Hệ thống để đảm bảo tính an toàn kỹ thuật và tài chính tối cao cho công trình cải tạo:

### A. Nhiệm vụ của Con người (Human-in-the-Loop) - Bắt buộc
*   **Đo đạc & Khảo sát**: Đo đạc kích thước thô tại thực địa căn hộ (Dài, Cao, diện tích cửa).
*   **Chọn biện pháp & Vật tư**: Lựa chọn loại gạch, loại tường và hỗn hợp vữa dán gạch phù hợp với điều kiện chịu lực dầm chung cư và độ dốc của nền cũ.
*   **Cân chỉnh Hao hụt (Waste Factor)**: Điều chỉnh % hao hụt của từng hạng mục dựa trên độ khó vận chuyển vật tư (căn hộ chung cư tầng cao) và tay nghề thợ.
*   **Nhập đơn giá thực tế**: Cập nhật đơn giá bán lẻ thực tế từ các đại lý vật liệu tại Hà Nội gần công trình nhất.
*   **Rà soát & Phê duyệt BOQ cuối**: Đóng vai trò kiểm duyệt tối cao, đối chiếu dữ liệu cuối cùng trước khi mua hàng hoặc ký kết hợp đồng.

### B. Nhiệm vụ của Hệ thống (AI-Automated) - Tự động hóa
*   **Tính toán số học & Định mức**: Áp dụng định mức vữa, gạch, cát, xi măng từ `constants.js` nhân chia khối lượng tức thời không sai sót số học.
*   **Quy đổi thương mại thương mại**: Tự động quy đổi kilôgam sang số bao thực tế (bao keo 25kg, bao xi măng 50kg) và tự động làm tròn lên.
*   **Cộng dồn phân khu**: Gom nhóm vật tư cùng loại từ tất cả các phòng đã tính toán thành bảng tổng hợp BOQ duy nhất toàn căn hộ.
*   **Kết xuất báo cáo**: Tự động tạo file CSV tiếng Việt có dấu, in PDF khổ A4 ngang landscape sạch đẹp tự động ẩn form, và tải ảnh chụp PNG.
