# Hướng dẫn sử dụng Business Logic (Nghiệp vụ)

Các hàm xử lý nghiệp vụ cho dự án đã được cài đặt trong file `businessLogic.ts`. 
Bạn có thể sử dụng các hàm này bằng cách import vào các API Routes của Next.js (trong thư mục `src/app/api/...`).

## 1. Chấm công (Attendance)

Mỗi khi nhân viên check-in/check-out qua máy chấm công hoặc app, sau khi bản ghi `Attendance` được tạo/cập nhật, bạn gọi hàm `determineAttendance` để hệ thống tự động tính toán số phút làm việc, đi trễ, về sớm, tăng ca và trạng thái.

```typescript
import { determineAttendance } from '@/services/businessLogic'

// Trong API Route xử lý check-in/check-out:
export async function POST(req) {
  // ... code lưu check-in/out vào DB ...
  
  try {
    // Tự động tính toán lại
    const updatedAttendance = await determineAttendance(attendanceId)
    return NextResponse.json({ success: true, data: updatedAttendance })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```

## 2. Phê duyệt đơn nghỉ (Leave Approval)

Khi Quản lý/HR nhấn nút duyệt đơn nghỉ phép của nhân viên trên giao diện:

```typescript
import { approveLeave } from '@/services/businessLogic'

export async function POST(req) {
  const { leaveId, actorId } = await req.json()
  
  try {
    await approveLeave(leaveId, actorId)
    return NextResponse.json({ success: true, message: 'Đã duyệt thành công' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```

## 3. Tính lương và Khóa kỳ lương (Payroll)

Khi HR nhấn nút "Tính lương tháng" cho một nhân viên:

```typescript
import { calculatePayroll, lockPeriod } from '@/services/businessLogic'

// 1. Tính toán bảng lương
export async function POST(req) {
  const { employeeId, periodId } = await req.json()
  try {
    const payroll = await calculatePayroll(employeeId, periodId)
    return NextResponse.json({ success: true, data: payroll })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

// 2. Khóa kỳ lương
export async function PATCH(req) {
  const { periodId, actorId } = await req.json()
  try {
    await lockPeriod(periodId, actorId)
    return NextResponse.json({ success: true, message: 'Đã khóa bảng lương' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```

## 4. Mở khóa và Điều chỉnh lương (Unlock & Adjustment)

Theo quy định, một khi bảng lương đã khóa, các thay đổi chấm công sẽ không tự động làm thay đổi lương. Nếu phát hiện sai sót, HR cần mở lại kỳ lương hoặc tạo khoản điều chỉnh ở kỳ sau, và mọi thao tác này sẽ tự động ghi lại Audit Log.

```typescript
import { unlockPeriod, createAdjustment } from '@/services/businessLogic'

// Mở lại kỳ lương đã khóa
export async function POST_UNLOCK(req) {
  const { periodId, actorId, reason } = await req.json()
  try {
    await unlockPeriod(periodId, actorId, reason)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

// Tạo khoản điều chỉnh (ví dụ: bồi thường sai sót chấm công)
export async function POST_ADJUSTMENT(req) {
  const { employeeId, monthStr, adjType, amount, description, actorId } = await req.json()
  try {
    const adj = await createAdjustment(employeeId, monthStr, adjType, amount, description, actorId)
    return NextResponse.json({ success: true, data: adj })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```
