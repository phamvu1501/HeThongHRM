# KIẾN TRÚC VÀ VỊ TRÍ CÁC CHỨC NĂNG TRONG MÃ NGUỒN

Tài liệu này giải thích cấu trúc thư mục của dự án HRM và vị trí chính xác của từng module, chức năng trong mã nguồn để lập trình viên dễ dàng tìm kiếm và chỉnh sửa.

## 1. Cấu trúc thư mục tổng quan

Dự án sử dụng Next.js 16 (App Router) kết hợp với Prisma ORM. Toàn bộ mã nguồn chính nằm trong thư mục `src/`.

```text
HeThongHRM/
├── prisma/                 # Chứa cấu trúc database (schema.prisma)
├── scripts/                # Script khởi tạo dữ liệu mẫu (seed.ts)
├── src/
│   ├── app/                # Chứa toàn bộ giao diện (Frontend) và API (Backend)
│   ├── components/         # Các UI component dùng chung
│   ├── lib/                # Chứa logic, kiểu dữ liệu, cấu hình chung
│   └── services/           # Chứa các service xử lý logic nghiệp vụ
├── package.json            # Quản lý các thư viện
└── .env                    # (Tự tạo) Cấu hình chuỗi kết nối Database
```

## 2. Vị trí chi tiết của các chức năng (Giao diện Frontend)

Mỗi chức năng chính của hệ thống được đặt trong một thư mục con thuộc `src/app/`. File giao diện mặc định là `page.tsx`.

- **Dashboard (Tổng quan)**: `src/app/dashboard/page.tsx` hoặc `src/app/page.tsx`
  - Hiển thị các chỉ số tổng quan, biểu đồ lương, cơ cấu nhân sự.
- **Quản lý Nhân viên**: `src/app/nhan-vien/page.tsx`
  - Thêm, sửa, xóa, tìm kiếm danh sách nhân sự.
- **Chấm công**: `src/app/cham-cong/page.tsx`
  - Giao diện ghi nhận giờ vào/ra, tính toán đi trễ về sớm.
- **Quản lý Đơn từ (Nghỉ phép)**: `src/app/don-tu/page.tsx`
  - Tạo và phê duyệt đơn xin nghỉ phép, nghỉ ốm, việc riêng.
- **Bảng lương**: `src/app/bang-luong/page.tsx`
  - Hiển thị và xử lý các kỳ lương, lương cơ bản, tổng nhận.
- **Phụ cấp & Khấu trừ**: `src/app/phu-cap/page.tsx`
  - Quản lý các khoản cộng thêm (thưởng) hoặc trừ đi (phạt) của nhân viên.
- **Danh mục nền**: `src/app/danh-muc/page.tsx`
  - Quản lý dữ liệu hệ thống như: Phòng ban, Chức vụ, Ca làm việc.
- **Cảnh báo**: `src/app/canh-bao/page.tsx`
  - Hiển thị danh sách các trường hợp đi trễ, quên chấm công, hoặc làm thiếu giờ.
- **Nhật ký hệ thống (Activity Log)**: `src/app/nhat-ky/page.tsx`
  - Lưu lại dấu vết thao tác của người dùng trên hệ thống.
- **Cài đặt**: `src/app/cai-dat/page.tsx`
  - Cấu hình các tham số động của hệ thống.

## 3. Vị trí xử lý Logic và API (Backend)

Hệ thống xử lý API thông qua tính năng Route Handlers của Next.js, đặt tại `src/app/api/`.

- **API Lấy và Lưu trữ dữ liệu chung**: `src/app/api/data/route.ts`
  - File này cực kỳ quan trọng. Nó xử lý việc `GET` toàn bộ dữ liệu từ PostgreSQL lên cho frontend và `POST` (upsert) cập nhật dữ liệu từ frontend xuống database.
- **API Ghi Nhật ký (Log)**: `src/app/api/logs/route.ts`
  - API chuyên biệt dùng để ghi nhận lịch sử các thao tác (Thêm/Sửa/Xóa).

## 4. Các File Cốt Lõi Khác Cần Chú Ý

- `src/components/Sidebar.tsx`: Thanh menu điều hướng bên trái. Logic phân quyền (ẩn/hiện menu dựa trên Role) nằm ở đây.
- `src/lib/types.ts`: Chứa toàn bộ các định nghĩa TypeScript (Interface) cho dữ liệu (Employee, Attendance, Payroll,...).
- `src/lib/store.ts`: Bộ máy xử lý Data ở Frontend. Nó gọi API lấy dữ liệu và lưu vào `localStorage` (cache) để giảm tải cho server.
- `prisma/schema.prisma`: Định nghĩa cấu trúc các bảng trong cơ sở dữ liệu PostgreSQL.
- `src/services/businessLogic.ts`: Định nghĩa các hàm xử lý logic nghiệp vụ phức tạp tách biệt khỏi giao diện.
