import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'

// ── Đường dẫn tới file Excel ──────────────────────────────────────────────────
const EXCEL_PATH = path.resolve(process.cwd(), 'HRM_mini_vn_2025-2026.xlsx')

/** Đọc tất cả dòng của một sheet từ file Excel */
function readSheet<T = Record<string, unknown>>(wb: XLSX.WorkBook, sheetName: string): T[] {
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  return XLSX.utils.sheet_to_json<T>(ws, { defval: '' })
}

/** Ghi toàn bộ dòng mới vào một sheet (xoá dữ liệu cũ, giữ header) */
function writeSheet(wb: XLSX.WorkBook, sheetName: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    // Không có row nào → xóa hết dữ liệu, giữ nguyên header cũ
    const ws = wb.Sheets[sheetName]
    if (!ws) return
    // Giữ header (row 1), xoá từ row 2 trở đi
    const ref = ws['!ref']
    if (!ref) return
    const range = XLSX.utils.decode_range(ref)
    for (let R = 1; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        delete ws[XLSX.utils.encode_cell({ r: R, c: C })]
      }
    }
    ws['!ref'] = XLSX.utils.encode_range({ s: range.s, e: { r: 0, c: range.e.c } })
    return
  }
  const ws = XLSX.utils.json_to_sheet(rows)
  wb.Sheets[sheetName] = ws
  if (!wb.SheetNames.includes(sheetName)) {
    wb.SheetNames.push(sheetName)
  }
}

/** Chuyển timestamp Excel / string sang YYYY-MM-DD */
function toDateStr(val: unknown): string {
  if (!val) return ''
  // Nếu là số (Excel serial date)
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    if (d) {
      const mm = String(d.m).padStart(2, '0')
      const dd = String(d.d).padStart(2, '0')
      return `${d.y}-${mm}-${dd}`
    }
  }
  const s = String(val)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return s
}

// ── Bảng ánh xạ status ────────────────────────────────────────────────────────
const ATTENDANCE_STATUS: Record<string, string> = {
  present: 'Đúng giờ', late: 'Đi trễ', 'early-leave': 'Về sớm',
  absent: 'Vắng mặt', overtime: 'Tăng ca', leave: 'Nghỉ phép',
  'Đúng giờ': 'Đúng giờ', 'Đi trễ': 'Đi trễ', 'Về sớm': 'Về sớm',
  'Vắng mặt': 'Vắng mặt', 'Tăng ca': 'Tăng ca', 'Nghỉ phép': 'Nghỉ phép',
}
const LEAVE_STATUS: Record<string, string> = {
  approved: 'Đã duyệt', pending: 'Chờ duyệt', rejected: 'Từ chối',
  'Đã duyệt': 'Đã duyệt', 'Chờ duyệt': 'Chờ duyệt', 'Từ chối': 'Từ chối',
}
const PAYROLL_STATUS: Record<string, string> = {
  approved: 'Đã thanh toán', pending: 'Chưa thanh toán', processing: 'Đang xử lý',
  'Đã thanh toán': 'Đã thanh toán', 'Chưa thanh toán': 'Chưa thanh toán', 'Đang xử lý': 'Đang xử lý',
}
const CONTRACT_TYPE: Record<string, string> = {
  official: 'Full-time', 'full-time': 'Full-time', 'part-time': 'Part-time',
  probation: 'Probation', contract: 'Contract',
  'Full-time': 'Full-time', 'Part-time': 'Part-time', 'Probation': 'Probation', 'Contract': 'Contract',
}
const GENDER_MAP: Record<string, string> = {
  male: 'Nam', female: 'Nữ', other: 'Khác',
  'Nam': 'Nam', 'Nữ': 'Nữ', 'Khác': 'Khác',
}
const EMPLOYEE_STATUS: Record<string, string> = {
  active: 'Active', inactive: 'Inactive',
  'Active': 'Active', 'Inactive': 'Inactive',
}
const LEAVE_TYPE: Record<string, string> = {
  annual: 'Nghỉ phép năm', sick: 'Nghỉ ốm', unpaid: 'Nghỉ không lương',
  maternity: 'Nghỉ chế độ', personal: 'Việc riêng',
  'Nghỉ phép năm': 'Nghỉ phép năm', 'Nghỉ ốm': 'Nghỉ ốm',
  'Nghỉ không lương': 'Nghỉ không lương', 'Nghỉ chế độ': 'Nghỉ chế độ', 'Việc riêng': 'Việc riêng',
}

// ── GET — đọc dữ liệu từ Excel ─────────────────────────────────────────────────
export async function GET() {
  try {
    if (!fs.existsSync(EXCEL_PATH)) {
      return NextResponse.json(
        { error: `Không tìm thấy file Excel tại: ${EXCEL_PATH}` },
        { status: 500 }
      )
    }

    const wb = XLSX.readFile(EXCEL_PATH)

    const rawDepartments   = readSheet<any>(wb, 'phong-ban')
    const rawPositions     = readSheet<any>(wb, 'chuc-vu')
    const rawEmployees     = readSheet<any>(wb, 'nhan-vien')
    const rawShifts        = readSheet<any>(wb, 'ca-lam')
    const rawAttendances   = readSheet<any>(wb, 'cham-cong')
    const rawLeaveRequests = readSheet<any>(wb, 'don-xin-nghi')
    const rawAdjustments   = readSheet<any>(wb, 'phu-cap-khau-tru')
    const rawPayrolls      = readSheet<any>(wb, 'bang-luong')
    const rawSettings      = readSheet<any>(wb, 'cai-dat')
    const rawLogs          = readSheet<any>(wb, 'nhat-ky')

    // --- departments ---
    const departments = rawDepartments.map((r: any) => ({
      department_id:   r.department_id,
      department_name: r.department_name,
      cost_center:     r.cost_center,
      manager_emp_id:  r.manager_emp_id,
      status:          EMPLOYEE_STATUS[r.status] ?? 'Active',
      created_at:      toDateStr(r.created_at),
    }))

    // --- positions ---
    const positions = rawPositions.map((r: any) => ({
      position_id:      r.position_id,
      position_name:    r.position_name,
      level:            r.level,
      salary_band_min:  Number(r.salary_band_min) || 0,
      salary_band_max:  Number(r.salary_band_max) || 0,
      status:           EMPLOYEE_STATUS[r.status] ?? 'Active',
    }))

    const deptMap = Object.fromEntries(departments.map(d => [d.department_id, d.department_name]))
    const posMap  = Object.fromEntries(positions.map(p => [p.position_id, p.position_name]))

    // --- employees ---
    const employees = rawEmployees.map((r: any) => ({
      employee_id:      r.employee_id,
      employee_code:    r.employee_code,
      full_name:        r.full_name,
      gender:           GENDER_MAP[r.gender] ?? r.gender ?? 'Nam',
      dob:              toDateStr(r.dob),
      phone:            r.phone,
      email:            r.email,
      address:          r.address,
      department_id:    r.department_id,
      department_name:  deptMap[r.department_id] ?? '',
      position_id:      r.position_id,
      position_name:    posMap[r.position_id] ?? '',
      join_date:        toDateStr(r.join_date),
      contract_type:    CONTRACT_TYPE[r.contract_type] ?? r.contract_type ?? 'Full-time',
      base_salary:      Number(r.base_salary) || 0,
      bank_account_no:  r.bank_account_no,
      status:           EMPLOYEE_STATUS[r.status] ?? 'Active',
      created_at:       toDateStr(r.created_at),
    }))

    const empMap = Object.fromEntries(employees.map(e => [e.employee_id, e.full_name]))

    // --- shifts ---
    const shifts = rawShifts.map((r: any) => ({
      shift_id:    r.shift_id,
      shift_name:  r.shift_name,
      start_time:  r.start_time,
      end_time:    r.end_time,
      break_min:   Number(r.break_min) || 0,
      work_hours:  Number(r.work_hours) || 8,
      status:      EMPLOYEE_STATUS[r.status] ?? 'Active',
    }))
    const shiftMap = Object.fromEntries(shifts.map(s => [s.shift_id, s.shift_name]))

    // --- attendances ---
    const attendances = rawAttendances.map((r: any) => {
      // check_in/check_out có thể là "2025-01-01 08:00:00" hoặc chỉ "08:00"
      const extractTime = (v: unknown) => {
        if (!v) return ''
        const s = String(v)
        if (s.includes(' ')) return s.slice(11, 16)   // "YYYY-MM-DD HH:mm:ss" → "HH:mm"
        if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5)
        return s
      }
      return {
        attendance_id:   r.attendance_id,
        work_date:       toDateStr(r.work_date),
        employee_id:     r.employee_id,
        employee_name:   empMap[r.employee_id] ?? '',
        shift_id:        r.shift_id,
        shift_name:      shiftMap[r.shift_id] ?? '',
        check_in:        extractTime(r.check_in),
        check_out:       extractTime(r.check_out),
        work_hours:      Number(r.work_hours) || 0,
        overtime_hours:  Number(r.overtime_hours) || 0,
        status:          ATTENDANCE_STATUS[r.status] ?? 'Đúng giờ',
        note:            r.note ?? '',
      }
    })

    // --- leave requests ---
    const leaveRequests = rawLeaveRequests.map((r: any) => ({
      leave_id:      r.leave_id,
      employee_id:   r.employee_id,
      employee_name: empMap[r.employee_id] ?? '',
      leave_type:    LEAVE_TYPE[r.leave_type] ?? r.leave_type ?? 'Nghỉ phép năm',
      from_date:     toDateStr(r.from_date),
      to_date:       toDateStr(r.to_date),
      days:          Number(r.days) || 1,
      reason:        r.reason ?? '',
      status:        LEAVE_STATUS[r.status] ?? 'Chờ duyệt',
      approved_by:   r.approved_by ?? '',
      approver_name: empMap[r.approved_by] ?? '',
      created_at:    r.created_at ? String(r.created_at) : new Date().toISOString(),
    }))

    // --- adjustments ---
    const adjustments = rawAdjustments.map((r: any) => ({
      adj_id:        r.adj_id,
      month:         String(r.month),
      employee_id:   r.employee_id,
      employee_name: empMap[r.employee_id] ?? r.employee_name ?? '',
      adj_type:      r.adj_type ?? '',
      amount:        Number(r.amount) || 0,
      description:   r.description ?? '',
      created_at:    toDateStr(r.created_at),
    }))

    // --- payrolls ---
    const payrolls = rawPayrolls.map((r: any) => ({
      payroll_id:          r.payroll_id,
      month:               String(r.month),
      employee_id:         r.employee_id,
      employee_name:       empMap[r.employee_id] ?? '',
      department_name:     deptMap[employees.find(e => e.employee_id === r.employee_id)?.department_id ?? ''] ?? '',
      base_salary:         Number(r.base_salary) || 0,
      work_days_standard:  Number(r.work_days_standard) || 0,
      work_days_actual:    Number(r.work_days_actual) || 0,
      overtime_hours:      Number(r.overtime_hours) || 0,
      overtime_pay:        Number(r.overtime_pay) || 0,
      allowance:           Number(r.allowance) || 0,
      deduction:           Number(r.deduction) || 0,
      gross_pay:           Number(r.gross_pay) || 0,
      insurance:           Number(r.insurance) || 0,
      pit:                 Number(r.pit) || 0,
      net_pay:             Number(r.net_pay) || 0,
      pay_date:            toDateStr(r.pay_date),
      status:              PAYROLL_STATUS[r.status] ?? 'Chưa thanh toán',
    }))

    // --- settings ---
    const settings = rawSettings.map((r: any) => ({
      setting_id:    r.setting_id,
      setting_key:   r.setting_key,
      setting_value: r.setting_value,
      setting_type:  r.setting_type,
      description:   r.description,
      updated_at:    r.updated_at,
    }))

    // --- logs ---
    const logs = rawLogs.map((r: any) => ({
      log_id:      r.log_id,
      log_time:    r.log_time,
      user:        r.user,
      action:      r.action,
      entity_type: r.entity_type,
      entity_id:   r.entity_id,
      description: r.description,
    }))

    return NextResponse.json({
      departments, positions, shifts,
      employees, attendances, leaveRequests,
      adjustments, payrolls, settings, logs,
    })
  } catch (err: any) {
    console.error('[API/data GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── POST — ghi dữ liệu vào sheet Excel ────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { sheet, rows } = await req.json() as { sheet: string; rows: unknown[] }
    if (!sheet || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'sheet và rows là bắt buộc' }, { status: 400 })
    }

    if (!fs.existsSync(EXCEL_PATH)) {
      return NextResponse.json(
        { error: `Không tìm thấy file Excel tại: ${EXCEL_PATH}` },
        { status: 500 }
      )
    }

    // Map tên UI → tên sheet Excel
    const SHEET_ALIAS: Record<string, string> = {
      employees:     'nhan-vien',
      attendances:   'cham-cong',
      leaveRequests: 'don-xin-nghi',
      adjustments:   'phu-cap-khau-tru',
      payrolls:      'bang-luong',
      departments:   'phong-ban',
      positions:     'chuc-vu',
      shifts:        'ca-lam',
      settings:      'cai-dat',
    }

    const targetSheet = SHEET_ALIAS[sheet] ?? sheet
    const wb = XLSX.readFile(EXCEL_PATH)

    if (!wb.SheetNames.includes(targetSheet)) {
      return NextResponse.json(
        { error: `Sheet "${targetSheet}" không tồn tại trong file Excel` },
        { status: 404 }
      )
    }

    // Reverse-map về dạng gốc (English) để lưu vào Excel
    const mapped = rows.map((r: any) => {
      const out: any = { ...r }

      if (sheet === 'employees') {
        out.status = r.status === 'Active' ? 'active' : 'inactive'
        out.gender = r.gender === 'Nam' ? 'male' : r.gender === 'Nữ' ? 'female' : 'other'
        const ctMap: Record<string, string> = {
          'Full-time': 'official', 'Part-time': 'part-time',
          Probation: 'probation', Contract: 'contract',
        }
        out.contract_type = ctMap[r.contract_type] ?? r.contract_type
        delete out.department_name
        delete out.position_name
      }

      if (sheet === 'attendances') {
        const REVERSE_ATT: Record<string, string> = {
          'Đúng giờ': 'present', 'Đi trễ': 'late', 'Về sớm': 'early-leave',
          'Vắng mặt': 'absent', 'Tăng ca': 'overtime', 'Nghỉ phép': 'leave',
        }
        out.status = REVERSE_ATT[r.status] ?? r.status
        // Khôi phục full datetime
        if (r.check_in && !r.check_in.includes(' '))
          out.check_in = `${r.work_date} ${r.check_in}:00`
        if (r.check_out && !r.check_out.includes(' '))
          out.check_out = `${r.work_date} ${r.check_out}:00`
        delete out.employee_name
        delete out.shift_name
      }

      if (sheet === 'leaveRequests') {
        const REVERSE_LS: Record<string, string> = {
          'Đã duyệt': 'approved', 'Chờ duyệt': 'pending', 'Từ chối': 'rejected',
        }
        const REVERSE_LT: Record<string, string> = {
          'Nghỉ phép năm': 'annual', 'Nghỉ ốm': 'sick', 'Nghỉ không lương': 'unpaid',
          'Nghỉ chế độ': 'maternity', 'Việc riêng': 'personal',
        }
        out.status     = REVERSE_LS[r.status] ?? r.status
        out.leave_type = REVERSE_LT[r.leave_type] ?? r.leave_type
        delete out.employee_name
        delete out.approver_name
      }

      if (sheet === 'payrolls') {
        const REVERSE_PS: Record<string, string> = {
          'Đã thanh toán': 'approved', 'Chưa thanh toán': 'pending', 'Đang xử lý': 'processing',
        }
        out.status = REVERSE_PS[r.status] ?? r.status
        delete out.employee_name
        delete out.department_name
      }

      if (['departments', 'positions', 'shifts'].includes(sheet)) {
        out.status = r.status === 'Active' ? 'active' : 'inactive'
      }

      return out
    })

    writeSheet(wb, targetSheet, mapped)
    XLSX.writeFile(wb, EXCEL_PATH)

    return NextResponse.json({ ok: true, sheet: targetSheet, count: mapped.length })
  } catch (err: any) {
    console.error('[API/data POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
