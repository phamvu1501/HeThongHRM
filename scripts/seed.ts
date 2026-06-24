import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'

import 'dotenv/config'
const prisma = new PrismaClient()

// Map tên UI -> tên sheet Excel
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
  logs:          'nhat-ky',
  enumValues:    'danh-muc-gia-tri'
}

function readSheet(wb: XLSX.WorkBook, sheetAlias: string) {
  const sheetName = SHEET_ALIAS[sheetAlias] ?? sheetAlias
  if (!wb.SheetNames.includes(sheetName)) return []
  return XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { raw: false, defval: '' }) as any[]
}

async function main() {
  const excelPath = path.resolve(process.cwd(), process.env.EXCEL_FILE || 'HRM_mini_vn_2025-2026.xlsx')
  if (!fs.existsSync(excelPath)) {
    console.error(`Không tìm thấy file Excel tại: ${excelPath}`)
    process.exit(1)
  }

  console.log(`Đang đọc dữ liệu từ ${excelPath}...`)
  const wb = XLSX.readFile(excelPath)

  const depts = readSheet(wb, 'departments')
  const positions = readSheet(wb, 'positions')
  const shifts = readSheet(wb, 'shifts')
  const settings = readSheet(wb, 'settings')
  const logs = readSheet(wb, 'logs')
  const enumValues = readSheet(wb, 'enumValues')
  const employees = readSheet(wb, 'employees')
  const attendances = readSheet(wb, 'attendances')
  const leaveRequests = readSheet(wb, 'leaveRequests')
  const adjustments = readSheet(wb, 'adjustments')
  const payrolls = readSheet(wb, 'payrolls')

  console.log('Bắt đầu bơm dữ liệu vào PostgreSQL...')

  // 1. Xóa dữ liệu cũ (Reverse order of dependencies)
  console.log('Đang dọn dẹp dữ liệu cũ (nếu có)...')
  await prisma.systemLog.deleteMany()
  await prisma.systemSetting.deleteMany()
  await prisma.payroll.deleteMany()
  await prisma.payrollPeriod.deleteMany()
  await prisma.adjustment.deleteMany()
  await prisma.leaveRequest.deleteMany()
  await prisma.attendanceAlert.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.salaryHistory.deleteMany()
  await prisma.shiftAssignment.deleteMany()
  await prisma.user.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.department.deleteMany()
  await prisma.position.deleteMany()
  await prisma.shift.deleteMany()
  await prisma.enumValue.deleteMany()

  // 2. Bơm bảng danh mục (không phụ thuộc)
  console.log('Bơm dữ liệu Danh mục (Phòng ban, Chức vụ, Ca làm, Cài đặt)...')
  for (const d of depts) {
    await prisma.department.create({
      data: {
        department_id: String(d.department_id),
        department_name: String(d.department_name),
        cost_center: String(d.cost_center),
        manager_emp_id: String(d.manager_emp_id),
        status: d.status === 'inactive' ? 'Inactive' : 'Active',
        created_at: String(d.created_at) || new Date().toISOString()
      }
    })
  }

  for (const p of positions) {
    await prisma.position.create({
      data: {
        position_id: String(p.position_id),
        position_name: String(p.position_name),
        level: String(p.level),
        salary_band_min: Number(p.salary_band_min) || 0,
        salary_band_max: Number(p.salary_band_max) || 0,
        status: p.status === 'inactive' ? 'Inactive' : 'Active',
      }
    })
  }

  for (const s of shifts) {
    await prisma.shift.create({
      data: {
        shift_id: String(s.shift_id),
        shift_name: String(s.shift_name),
        start_time: String(s.start_time),
        end_time: String(s.end_time),
        break_min: Number(s.break_min) || 0,
        work_hours: Number(s.work_hours) || 0,
        status: s.status === 'inactive' ? 'Inactive' : 'Active',
      }
    })
  }

  for (const s of settings) {
    await prisma.systemSetting.create({
      data: {
        setting_id: String(s.setting_id),
        setting_key: String(s.setting_key),
        setting_value: String(s.setting_value),
        setting_type: String(s.setting_type),
        description: String(s.description),
        updated_at: String(s.updated_at)
      }
    })
  }

  // 2.5 Admin user (no employee)
  await prisma.user.create({
    data: {
      username: 'admin',
      password_hash: '123123',
      role: 'ADMIN',
      status: 'Active',
      created_at: new Date().toISOString()
    }
  })

  // 3. Bơm Nhân viên (phụ thuộc Phòng ban, Chức vụ)
  console.log('Bơm dữ liệu Nhân viên...')
  for (const e of employees) {
    const ctMap: Record<string, string> = {
      'official': 'Full-time', 'part-time': 'Part-time',
      'probation': 'Probation', 'contract': 'Contract'
    }
    try {
      await prisma.employee.create({
        data: {
          employee_id: String(e.employee_id),
          employee_code: String(e.employee_code),
          full_name: String(e.full_name),
          gender: e.gender === 'male' ? 'Nam' : e.gender === 'female' ? 'Nữ' : 'Khác',
          dob: String(e.dob),
          phone: String(e.phone),
          email: String(e.email),
          address: String(e.address),
          join_date: String(e.join_date),
          contract_type: ctMap[e.contract_type] ?? 'Full-time',
          base_salary: Number(e.base_salary) || 0,
          bank_account_no: String(e.bank_account_no),
          status: e.status === 'inactive' ? 'Inactive' : 'Active',
          created_at: String(e.created_at) || new Date().toISOString(),
          department_id: String(e.department_id),
          position_id: String(e.position_id)
        }
      })

      // Generate User
      await prisma.user.create({
        data: {
          username: String(e.employee_code),
          password_hash: '123123',
          role: 'EMPLOYEE',
          status: 'Active',
          created_at: new Date().toISOString(),
          employee_id: String(e.employee_id)
        }
      })

      // Generate SalaryHistory
      await prisma.salaryHistory.create({
        data: {
          amount: Number(e.base_salary) || 0,
          effective_from: String(e.join_date),
          created_at: new Date().toISOString(),
          employee_id: String(e.employee_id)
        }
      })

      // Generate ShiftAssignment
      const firstShift = shifts.length > 0 ? shifts[0].shift_id : 'S001'
      await prisma.shiftAssignment.create({
        data: {
          effective_from: String(e.join_date),
          created_at: new Date().toISOString(),
          employee_id: String(e.employee_id),
          shift_id: String(firstShift)
        }
      })
    } catch (err: any) {
      console.warn(`Bỏ qua nhân viên ${e.employee_id} do lỗi (thường là sai ID Phòng ban/Chức vụ)`)
    }
  }

  // 4. Bơm dữ liệu liên quan đến nhân viên
  console.log('Bơm dữ liệu Chấm công, Xin nghỉ, Phụ cấp, Bảng lương...')
  
  // Attendances
  const REVERSE_ATT: Record<string, string> = {
    'present': 'Đúng giờ', 'late': 'Đi trễ', 'early-leave': 'Về sớm',
    'absent': 'Vắng mặt', 'overtime': 'Tăng ca', 'leave': 'Nghỉ phép',
  }
  for (const a of attendances) {
    try {
      await prisma.attendance.create({
        data: {
          attendance_id: String(a.attendance_id),
          work_date: String(a.work_date),
          check_in: String(a.check_in),
          check_out: String(a.check_out),
          work_minutes: (Number(a.work_hours) || 0) * 60,
          overtime_minutes: (Number(a.overtime_hours) || 0) * 60,
          late_minutes: 0,
          early_leave_minutes: 0,
          status: REVERSE_ATT[a.status] ?? 'Đúng giờ',
          note: String(a.note),
          employee_id: String(a.employee_id),
          shift_id: String(a.shift_id)
        }
      })
    } catch(err) {}
  }

  // Leave Requests
  const REVERSE_LS: Record<string, string> = {
    'approved': 'Đã duyệt', 'pending': 'Chờ duyệt', 'rejected': 'Từ chối',
  }
  const REVERSE_LT: Record<string, string> = {
    'annual': 'Nghỉ phép năm', 'sick': 'Nghỉ ốm', 'unpaid': 'Nghỉ không lương',
    'maternity': 'Nghỉ chế độ', 'personal': 'Việc riêng',
  }
  for (const l of leaveRequests) {
    try {
      await prisma.leaveRequest.create({
        data: {
          leave_id: String(l.leave_id),
          leave_type: REVERSE_LT[l.leave_type] ?? 'Nghỉ phép năm',
          from_date: String(l.from_date),
          to_date: String(l.to_date),
          days: Number(l.days) || 0,
          reason: String(l.reason),
          status: REVERSE_LS[l.status] ?? 'Chờ duyệt',
          approved_by: String(l.approved_by),
          created_at: String(l.created_at) || new Date().toISOString(),
          employee_id: String(l.employee_id)
        }
      })
    } catch(err) {}
  }

  // Adjustments
  for (const a of adjustments) {
    try {
      await prisma.adjustment.create({
        data: {
          adj_id: String(a.adj_id),
          month: String(a.month),
          adj_type: String(a.adj_type),
          amount: Number(a.amount) || 0,
          description: String(a.description),
          created_at: String(a.created_at) || new Date().toISOString(),
          employee_id: String(a.employee_id)
        }
      })
    } catch(err) {}
  }

  // Payroll Periods
  const uniqueMonths = Array.from(new Set(payrolls.map((p: any) => p.month).filter(Boolean)))
  for (const m of uniqueMonths) {
    const monthStr = String(m);
    const periodId = `PRP_${monthStr.replace('-', '')}`
    await prisma.payrollPeriod.create({
      data: {
        period_id: periodId,
        month: monthStr.split('-')[1] || '01',
        year: monthStr.split('-')[0] || '2026',
        state: 'PAID',
        created_at: new Date().toISOString()
      }
    })
  }

  // Payrolls
  const REVERSE_PS: Record<string, string> = {
    'approved': 'Đã thanh toán', 'pending': 'Chưa thanh toán', 'processing': 'Đang xử lý',
  }
  for (const p of payrolls) {
    if (!p.month) continue;
    try {
      const periodId = `PRP_${String(p.month).replace('-', '')}`
      await prisma.payroll.create({
        data: {
          payroll_id: String(p.payroll_id),
          version: 1,
          period_id: periodId,
          base_salary: Number(p.base_salary) || 0,
          work_days_standard: Number(p.work_days_standard) || 0,
          work_days_actual: Number(p.work_days_actual) || 0,
          overtime_hours: Number(p.overtime_hours) || 0,
          overtime_pay: Number(p.overtime_pay) || 0,
          allowance: Number(p.allowance) || 0,
          deduction: Number(p.deduction) || 0,
          gross_pay: Number(p.gross_pay) || 0,
          insurance: Number(p.insurance) || 0,
          pit: Number(p.pit) || 0,
          net_pay: Number(p.net_pay) || 0,
          pay_date: String(p.pay_date),
          status: REVERSE_PS[p.status] ?? 'Chưa thanh toán',
          employee_id: String(p.employee_id)
        }
      })
    } catch(err) {}
  }

  // Logs
  for (const l of logs) {
    await prisma.systemLog.create({
      data: {
        log_id: String(l.log_id),
        log_time: String(l.log_time),
        user: String(l.user),
        action: String(l.action),
        entity_type: String(l.entity_type),
        entity_id: String(l.entity_id),
        description: String(l.description)
      }
    })
  }

  console.log('✅ Chuyển đổi dữ liệu sang PostgreSQL thành công!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

