# HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY DỰ ÁN TRÊN MÁY KHÁC VỚI VS CODE

Tài liệu này hướng dẫn các bước chi tiết để clone dự án từ GitHub và khởi chạy hệ thống HRM trên một máy tính mới.

## 1. Yêu cầu hệ thống (Prerequisites)
Trước khi bắt đầu, máy tính cần cài đặt sẵn các phần mềm sau:
- **Node.js**: Phiên bản 18.x hoặc 20.x trở lên. (Tải tại [nodejs.org](https://nodejs.org/)).
- **PostgreSQL**: Hệ quản trị cơ sở dữ liệu PostgreSQL (Tải tại [postgresql.org](https://www.postgresql.org/download/)).
- **Git**: Để tải code về (Tải tại [git-scm.com](https://git-scm.com/)).
- **Visual Studio Code (VS Code)**: Trình soạn thảo mã nguồn.

## 2. Các bước cài đặt chi tiết

### Bước 1: Tải mã nguồn từ GitHub
1. Mở terminal (Command Prompt, PowerShell hoặc Git Bash).
2. Di chuyển đến thư mục bạn muốn lưu dự án.
3. Chạy lệnh clone:
   ```bash
   git clone https://github.com/phamvu1501/HeThongHRM.git
   ```

### Bước 2: Mở dự án trong VS Code
1. Mở **Visual Studio Code**.
2. Chọn `File` -> `Open Folder...` và chọn thư mục `HeThongHRM` vừa tải về.
3. Mở Terminal tích hợp trong VS Code bằng phím tắt `Ctrl + \`` (hoặc chọn `Terminal` -> `New Terminal`).

### Bước 3: Cài đặt thư viện (Dependencies)
Trong Terminal của VS Code, chạy lệnh sau để tải các thư viện cần thiết:
```bash
npm install
```

### Bước 4: Thiết lập Cơ sở dữ liệu (PostgreSQL)
1. Mở pgAdmin hoặc công cụ quản lý PostgreSQL của bạn.
2. Tạo một database mới (ví dụ đặt tên là `hrm`).
3. Trong thư mục dự án trên VS Code, tạo một file mới có tên là `.env` (ngang hàng với `package.json`).
4. Thêm nội dung sau vào file `.env` (thay đổi `postgres` và `password` thành user/mật khẩu PostgreSQL của máy bạn):
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/hrm?schema=public"
   ```

### Bước 5: Khởi tạo bảng và dữ liệu mẫu
Hệ thống sử dụng Prisma ORM. Chạy các lệnh sau trong Terminal để tạo bảng và sinh dữ liệu:
1. Đồng bộ cấu trúc bảng vào database:
   ```bash
   npx prisma db push
   ```
2. Cập nhật Prisma Client:
   ```bash
   npx prisma generate
   ```
3. Chạy script tạo dữ liệu mẫu (Seed) (nếu cần thiết để có dữ liệu test ban đầu):
   ```bash
   npm run prisma:seed
   ```
*(Lưu ý: Nếu bạn có file `reset_db.bat`, bạn cũng có thể chạy file này trên Windows để tự động reset lại toàn bộ DB).*

### Bước 6: Khởi chạy ứng dụng
1. Sau khi cài đặt và thiết lập DB xong, chạy lệnh:
   ```bash
   npm run dev
   ```
2. Mở trình duyệt web (Chrome/Edge/Safari) và truy cập địa chỉ:
   ```text
   http://localhost:3000
   ```
Hệ thống sẽ hiển thị trang Dashboard hoặc trang Đăng nhập. Bạn đã cấu hình thành công!
