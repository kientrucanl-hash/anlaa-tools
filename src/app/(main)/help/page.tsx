import { PageHeader } from '@/components/layout/PageHeader'

const sections = [
  ['Dự toán chi phí', 'Mở dự án từ Dashboard, chọn Từ mẫu hoặc thêm hạng mục, nhập dòng diễn giải và kích thước. Dùng Bảng giá & NTP để so sánh đơn giá rồi áp ngược vào dự toán.'],
  ['Vật tư cần mua', 'Trang này tự bóc định mức từ các hạng mục dự toán có work item như xây, trát, cán nền, ốp lát, bê tông. Có thể in hoặc xuất CSV.'],
  ['Bảng giá & NTP', 'Chọn nhà thầu phụ, nhập đơn giá theo từng hạng mục, lưu giá vào hồ sơ NTP, áp giá thấp nhất hoặc giá đã chọn vào dự toán. Tab giá bán công ty dùng hệ số lợi nhuận.'],
  ['Nhà thầu phụ', 'Admin quản lý trực tiếp danh bạ. User thường dùng Đề xuất để tạo nháp nhà thầu, gửi duyệt; admin duyệt để ghi vào danh bạ.'],
  ['Công cụ bóc tách', 'Xây & Trát, Cán nền và Ốp lát là các calculator nhanh cho khối lượng vật tư theo công thức đã port từ HTML cũ.'],
  ['Báo giá so sánh', 'Tạo bảng báo giá, nhập 3 nhà thầu và các dòng chào giá, sau đó nộp duyệt để admin approve/reject.'],
]

export default function HelpPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <PageHeader
        eyebrow="User guide"
        title="Hướng dẫn sử dụng"
        subtitle="Quy trình thao tác chính của ANLAA Estimate, app dự toán thay G8."
      />
      <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.875rem', padding: '1rem' }}>
        {sections.map(([title, body]) => (
          <section key={title} style={{ border: '1px solid var(--border-glass)', borderRadius: 8, padding: '0.875rem' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 800 }}>{title}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6, marginTop: '0.35rem' }}>{body}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
