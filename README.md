# HRM

Ứng dụng HRM mini viết bằng Next.js App Router, giao diện tiếng Việt, tập trung vào 5 nghiệp vụ chính:

- Quản lý nhân viên
- Chấm công
- Đơn nghỉ phép
- Phụ cấp và khấu trừ
- Bảng lương

Tài liệu này được viết theo kiểu handoff để AI agent hoặc người mua đọc vào là hiểu nhanh dự án đang vận hành như thế nào.

## 1. Tóm tắt kiến trúc

- Framework: `Next.js 16` + `React 19` + `TypeScript`
- UI: CSS thuần trong `src/app/globals.css`, icon qua Google Material Symbols
- Data source chính: `Google Sheets`
- Cơ chế đọc ghi:
  - Frontend gọi `GET /api/data` để lấy toàn bộ dữ liệu
  - Frontend gọi `POST /api/data` để ghi lại từng sheet
  - Frontend gọi `POST /api/logs` để append activity log
- Cache phía client: `localStorage`, TTL `60 giây`
- Export Excel phía client: dùng thư viện `xlsx`

Điểm quan trọng: đây không phải app dùng database truyền thống. Dữ liệu nghiệp vụ đang được xem như một lớp UI + API bọc ngoài Google Sheets.

## 2. Cấu trúc thư mục

```text
src/
  app/
    api/
      data/route.ts        # đọc/ghi dữ liệu Google Sheets
      logs/route.ts        # ghi nhật ký hoạt động vào Google Sheets
    page.tsx               # dashboard tổng quan
    nhan-vien/page.tsx     # nhân viên
    cham-cong/page.tsx     # chấm công
    don-tu/page.tsx        # đơn từ / nghỉ phép
    bang-luong/page.tsx    # bảng lương
    phu-cap/page.tsx       # phụ cấp & khấu trừ
    danh-muc/page.tsx      # danh mục nền
    nhat-ky/page.tsx       # activity log
    cai-dat/page.tsx       # cấu hình hệ thống
  components/
    Sidebar.tsx
    TopBar.tsx
    Modal.tsx
    ConfirmDialog.tsx
  lib/
    store.ts               # fetchData, saveSheet, logActivity, cache localStorage
    excel.ts               # export Excel từ frontend
    types.ts               # type trung tâm cho toàn bộ domain
    mock-data.ts           # dữ liệu mẫu, hữu ích khi cần seed/migrate
    utils.ts               # format, helper UI
```

## 3. Các màn hình chính

- `/`: Dashboard KPI tổng quan
- `/nhan-vien`: CRUD danh sách nhân viên
- `/cham-cong`: quản lý chấm công
- `/don-tu`: quản lý đơn nghỉ phép / phê duyệt
- `/bang-luong`: xem và xử lý bảng lương
- `/phu-cap`: phụ cấp, thưởng, khấu trừ
- `/danh-muc`: phòng ban, chức vụ, ca làm việc
- `/nhat-ky`: nhật ký thao tác
- `/cai-dat`: tham số hệ thống

Sidebar được khai báo tại `src/components/Sidebar.tsx`.

## 4. Luồng dữ liệu thực tế

### 4.1 Frontend

`src/lib/store.ts` là entrypoint dữ liệu ở client:

- `fetchData(forceRefresh?)`: gọi `GET /api/data`
- `saveEmployees`, `saveAttendances`, `saveLeaveRequests`, ...: gọi `POST /api/data`
- `logActivity(...)`: gọi `POST /api/logs`
- Cache key: `hrm-pro-cache-v2`
- Cache TTL: `60_000 ms`

### 4.2 Backend API

`src/app/api/data/route.ts`:

- Kết nối Google Sheets bằng `google-spreadsheet` + `google-auth-library`
- Đọc nhiều sheet nghiệp vụ và normalize về shape frontend
- Khi ghi, map ngược dữ liệu UI tiếng Việt về giá trị lưu trữ gốc

`src/app/api/logs/route.ts`:

- Ghi thêm 1 dòng log vào sheet `nhat-ky`
- Tự sinh `log_id` dạng `LOG-000001`

## 5. Mapping sheet Google Sheets

Các sheet hiện tại được app kỳ vọng:

- `phong-ban`
- `chuc-vu`
- `nhan-vien`
- `ca-lam`
- `cham-cong`
- `don-xin-nghi`
- `phu-cap-khau-tru`
- `bang-luong`
- `cai-dat`
- `nhat-ky`

Alias dùng khi frontend ghi dữ liệu:

- `employees` -> `nhan-vien`
- `attendances` -> `cham-cong`
- `leaveRequests` -> `don-xin-nghi`
- `adjustments` -> `phu-cap-khau-tru`
- `payrolls` -> `bang-luong`
- `departments` -> `phong-ban`
- `positions` -> `chuc-vu`
- `shifts` -> `ca-lam`
- `settings` -> `cai-dat`

## 6. Domain model

Type trung tâm nằm ở `src/lib/types.ts`.

Các nhóm dữ liệu chính:

- `SystemSetting`
- `Department`
- `Position`
- `Employee`
- `Shift`
- `Attendance`
- `LeaveRequest`
- `Adjustment`
- `Payroll`
- `SystemLog`
- `EnumValue`

AppData tổng hợp toàn bộ dữ liệu để render UI.

## 7. Cấu hình môi trường

App hỗ trợ 2 cách cấp quyền Google Sheets:

1. Dùng biến môi trường `GOOGLE_CREDENTIALS`
2. Dùng file JSON service account và trỏ bằng `GOOGLE_TOKEN_PATH`

Mẫu biến môi trường xem tại `.env.example`.

Lưu ý:

- File `.env` cũ trong máy dev chứa token riêng và không nên chia sẻ.
- File `token.json` trong máy dev cũng là bí mật và không nên đóng gói cho người mua.

## 8. Cách chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`

## 9. Build production

```bash
npm run build
npm run start
```

## 10. Các phụ thuộc quan trọng

- `next`
- `react`
- `google-spreadsheet`
- `google-auth-library`
- `xlsx`
- `recharts`
- `date-fns`
- `lucide-react`

## 11. Hành vi và giả định quan trọng

Đây là các điểm AI hoặc dev mới cần biết ngay:

- Dashboard đang dùng ngày giả lập cứng `2026-02-28` trong `src/app/page.tsx`, không dùng ngày hệ thống thực.
- Ứng dụng hiện không có auth thật. User ở sidebar chỉ là dữ liệu tĩnh.
- API route đang chứa `SPREADSHEET_ID` hardcoded trong code.
- Khi ghi 1 sheet, logic hiện tại `clearRows()` rồi `addRows()` lại toàn bộ sheet đó.
  Điều này đơn giản nhưng có rủi ro nếu nhiều người sửa đồng thời.
- `src/lib/mock-data.ts` là nguồn tham khảo tốt để hiểu schema và dữ liệu mẫu, nhưng app runtime hiện ưu tiên Google Sheets chứ không lấy mock để render.
- `loadData()` trong `src/lib/store.ts` chỉ trả dữ liệu cache hoặc object rỗng. Nó không tự gọi API.

## 12. Điểm cần lưu ý nếu tiếp tục phát triển

- Tách `SPREADSHEET_ID` ra env
- Bổ sung auth/role thật
- Thêm validation input ở API layer
- Tránh chiến lược xóa toàn bộ sheet rồi ghi lại
- Thêm test cho transform dữ liệu giữa UI <-> Google Sheets
- Chuẩn hóa fallback khi Google Sheets unavailable

## 13. Bản đóng gói chuyển giao

Bản zip nhẹ được tạo để bàn giao source code, mặc định loại khỏi gói:

- `node_modules`
- `.next`
- `.vercel`
- `.git`
- `.env`
- `token.json`
- file `.zip`
- file `.DS_Store`

Mục tiêu của gói này là:

- đủ mã nguồn để đọc và chỉnh sửa
- đủ hướng dẫn để cài lại dependency
- không kèm cache build và bí mật môi trường

## 14. File quan trọng nên đọc trước nếu bạn là AI agent

1. `src/lib/types.ts`
2. `src/lib/store.ts`
3. `src/app/api/data/route.ts`
4. `src/app/api/logs/route.ts`
5. `src/components/Sidebar.tsx`
6. `src/app/page.tsx`
7. `src/lib/mock-data.ts`

Chỉ cần đọc 7 file trên là có thể hiểu phần lớn kiến trúc, domain và luồng dữ liệu của dự án.
