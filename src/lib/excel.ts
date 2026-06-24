/**
 * HRM - Excel Utilities
 * Xuất/nhập dữ liệu Excel sử dụng thư viện xlsx
 */
import * as XLSX from 'xlsx'
import type { Attendance, Employee, LeaveRequest, Adjustment, Payroll } from './types'
import { formatCurrency } from './utils'

// ── EXPORT ───────────────────────────────────────────────────────────────────

function download(wb: XLSX.WorkBook, fileName: string) {
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

function autoWidth(ws: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  const cols: { wch: number }[] = []
  for (let C = range.s.c; C <= range.e.c; C++) {
    let max = 10
    for (let R = range.s.r; R <= range.e.r; R++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })]
      if (cell && cell.v != null) {
        const len = String(cell.v).length
        if (len > max) max = len
      }
    }
    cols.push({ wch: Math.min(max + 2, 40) })
  }
  ws['!cols'] = cols
}

// Chấm công
export function exportAttendances(records: Attendance[]) {
  const rows = records.map(a => ({
    'Mã CC': a.attendance_id,
    'Ngày': a.work_date,
    'Nhân viên': a.employee_name ?? a.employee_id,
    'Ca làm': a.shift_name ?? a.shift_id,
    'Giờ vào': a.check_in || '—',
    'Giờ ra': a.check_out || '—',
    'Phút làm': a.work_minutes,
    'Phút tăng ca': a.overtime_minutes,
    'Trạng thái': a.status,
    'Ghi chú': a.note,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  autoWidth(ws)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Chấm công')
  download(wb, `ChamCong_${new Date().toISOString().slice(0, 10)}`)
}

// Nhân viên
export function exportEmployees(records: Employee[]) {
  const rows = records.map(e => ({
    'Mã NV': e.employee_code,
    'Họ và tên': e.full_name,
    'Giới tính': e.gender,
    'Ngày sinh': e.dob,
    'Điện thoại': e.phone,
    'Email': e.email,
    'Phòng ban': e.department_name ?? e.department_id,
    'Chức vụ': e.position_name ?? e.position_id,
    'Loại HĐ': e.contract_type,
    'Ngày vào': e.join_date,
    'Lương CB': e.base_salary,
    'STK Ngân hàng': e.bank_account_no,
    'Địa chỉ': e.address,
    'Trạng thái': e.status,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  autoWidth(ws)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Nhân viên')
  download(wb, `NhanVien_${new Date().toISOString().slice(0, 10)}`)
}

// Đơn từ
export function exportLeaveRequests(records: LeaveRequest[]) {
  const rows = records.map(l => ({
    'Mã đơn': l.leave_id,
    'Nhân viên': l.employee_name ?? l.employee_id,
    'Loại nghỉ': l.leave_type,
    'Từ ngày': l.from_date,
    'Đến ngày': l.to_date,
    'Số ngày': l.days,
    'Lý do': l.reason,
    'Trạng thái': l.status,
    'Người duyệt': l.approver_name ?? l.approved_by ?? '—',
    'Ngày tạo': l.created_at.slice(0, 10),
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  autoWidth(ws)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Đơn từ')
  download(wb, `DonTu_${new Date().toISOString().slice(0, 10)}`)
}

// Phụ cấp & Khấu trừ
export function exportAdjustments(records: Adjustment[]) {
  const rows = records.map(a => ({
    'Mã': a.adj_id,
    'Tháng': a.month,
    'Nhân viên': a.employee_name ?? a.employee_id,
    'Loại': a.adj_type,
    'Số tiền': a.amount,
    'Số tiền (hiển thị)': formatCurrency(a.amount),
    'Mô tả': a.description,
    'Ngày tạo': a.created_at,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  autoWidth(ws)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Phụ cấp - Khấu trừ')
  download(wb, `PhuCap_${new Date().toISOString().slice(0, 10)}`)
}

// Bảng lương
export function exportPayrolls(records: Payroll[]) {
  const rows = records.map(p => ({
    'Mã': p.payroll_id,
    'Tháng': p.month,
    'Nhân viên': p.employee_name ?? p.employee_id,
    'Phòng ban': p.department_name ?? '—',
    'Lương CB': p.base_salary,
    'Ngày chuẩn': p.work_days_standard,
    'Ngày thực': p.work_days_actual,
    'Giờ OT': p.overtime_hours,
    'Tiền OT': p.overtime_pay,
    'Phụ cấp': p.allowance,
    'Khấu trừ': p.deduction,
    'Gross': p.gross_pay,
    'BHXH/Thuế': p.insurance + p.pit,
    'Net': p.net_pay,
    'Trạng thái': p.status,
    'Ngày trả': p.pay_date,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  autoWidth(ws)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Bảng lương')
  download(wb, `BangLuong_${new Date().toISOString().slice(0, 10)}`)
}

// Xuất toàn bộ (multi-sheet)
export function exportAllData(data: {
  employees: Employee[]
  attendances: Attendance[]
  leaveRequests: LeaveRequest[]
  adjustments: Adjustment[]
  payrolls: Payroll[]
}) {
  const wb = XLSX.utils.book_new()

  const empRows = data.employees.map(e => ({
    'Mã NV': e.employee_code, 'Họ tên': e.full_name, 'Giới tính': e.gender,
    'Ngày sinh': e.dob, 'ĐT': e.phone, 'Email': e.email,
    'Phòng ban': e.department_name ?? e.department_id,
    'Chức vụ': e.position_name ?? e.position_id,
    'Loại HĐ': e.contract_type, 'Ngày vào': e.join_date,
    'Lương CB': e.base_salary, 'Trạng thái': e.status,
  }))
  const ws1 = XLSX.utils.json_to_sheet(empRows); autoWidth(ws1)
  XLSX.utils.book_append_sheet(wb, ws1, 'Nhân viên')

  const attRows = data.attendances.map(a => ({
    'Ngày': a.work_date, 'Nhân viên': a.employee_name ?? a.employee_id,
    'Ca làm': a.shift_name ?? a.shift_id,
    'Giờ vào': a.check_in, 'Giờ ra': a.check_out,
    'Phút làm': a.work_minutes, 'Phút tăng ca': a.overtime_minutes,
    'Trạng thái': a.status, 'Ghi chú': a.note,
  }))
  const ws2 = XLSX.utils.json_to_sheet(attRows); autoWidth(ws2)
  XLSX.utils.book_append_sheet(wb, ws2, 'Chấm công')

  const lvRows = data.leaveRequests.map(l => ({
    'Mã': l.leave_id, 'Nhân viên': l.employee_name ?? l.employee_id,
    'Loại': l.leave_type, 'Từ': l.from_date, 'Đến': l.to_date,
    'Ngày': l.days, 'Lý do': l.reason, 'Trạng thái': l.status,
  }))
  const ws3 = XLSX.utils.json_to_sheet(lvRows); autoWidth(ws3)
  XLSX.utils.book_append_sheet(wb, ws3, 'Đơn từ')

  const adjRows = data.adjustments.map(a => ({
    'Tháng': a.month, 'Nhân viên': a.employee_name ?? a.employee_id,
    'Loại': a.adj_type, 'Số tiền': a.amount, 'Mô tả': a.description,
  }))
  const ws4 = XLSX.utils.json_to_sheet(adjRows); autoWidth(ws4)
  XLSX.utils.book_append_sheet(wb, ws4, 'Phụ cấp - KT')

  const payRows = data.payrolls.map(p => ({
    'Tháng': p.month, 'Nhân viên': p.employee_name ?? p.employee_id,
    'Gross': p.gross_pay, 'Net': p.net_pay,
    'BHXH+Thuế': p.insurance + p.pit, 'Trạng thái': p.status,
  }))
  const ws5 = XLSX.utils.json_to_sheet(payRows); autoWidth(ws5)
  XLSX.utils.book_append_sheet(wb, ws5, 'Bảng lương')

  download(wb, `HRM_Pro_Export_${new Date().toISOString().slice(0, 10)}`)
}
