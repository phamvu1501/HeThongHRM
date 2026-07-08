import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ─── GET ────────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const [
      departments, positions, shifts, settings, logs,
      users, salaryHistories, shiftAssignments, payrollPeriods, attendanceAlerts,
      employeesRaw, attendancesRaw, leaveRequestsRaw, adjustmentsRaw, payrollsRaw
    ] = await Promise.all([
      prisma.department.findMany(),
      prisma.position.findMany(),
      prisma.shift.findMany(),
      prisma.systemSetting.findMany(),
      prisma.systemLog.findMany({ take: 200, orderBy: { log_time: 'desc' } }),
      
      prisma.user.findMany(),
      prisma.salaryHistory.findMany(),
      prisma.shiftAssignment.findMany(),
      prisma.payrollPeriod.findMany(),
      prisma.attendanceAlert.findMany(),

      prisma.employee.findMany({
        include: { department: true, position: true }
      }),
      
      prisma.attendance.findMany({
        include: { employee: true, shift: true }
      }),

      prisma.leaveRequest.findMany({
        include: { employee: true }
      }),

      prisma.adjustment.findMany({
        include: { employee: true }
      }),

      prisma.payroll.findMany({
        include: {
          employee: { include: { department: true } },
          period: true
        }
      })
    ])

    const employees = employeesRaw.map(e => ({
      ...e,
      department_name: e.department?.department_name || '',
      position_name: e.position?.position_name || ''
    }))

    const attendances = attendancesRaw.map(a => ({
      ...a,
      employee_name: a.employee?.full_name || '',
      shift_name: a.shift?.shift_name || ''
    }))

    const leaveRequests = leaveRequestsRaw.map(l => {
      const approver = employeesRaw.find(e => e.employee_id === l.approved_by)
      return {
        ...l,
        employee_name: l.employee?.full_name || '',
        approver_name: approver?.full_name || ''
      }
    })

    const adjustments = adjustmentsRaw.map(a => ({
      ...a,
      employee_name: a.employee?.full_name || ''
    }))

    const payrolls = payrollsRaw.map(p => ({
      ...p,
      month: `${p.period?.year}-${p.period?.month}`,
      employee_name: p.employee?.full_name || '',
      department_name: p.employee?.department?.department_name || ''
    }))

    const enumValues: any[] = []

    return NextResponse.json({
      departments, positions, shifts,
      employees, attendances, leaveRequests,
      adjustments, payrolls, settings, logs, enumValues,
      users, salaryHistories, shiftAssignments, payrollPeriods, attendanceAlerts
    })
  } catch (err: any) {
    console.error('[API/data GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { sheet, rows } = await req.json() as { sheet: string; rows: any[] }
    if (!sheet || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'sheet và rows là bắt buộc' }, { status: 400 })
    }

    let count = 0;
    
    // --- LƯU LÊN POSTGRESQL (PRISMA TRANSACTION BATCH VỚI DIFFING ĐỂ TỐI ƯU HIỆU NĂNG) ---
    if (sheet === 'departments') {
      const existing = await prisma.department.findMany({
        select: { department_id: true, department_name: true, cost_center: true, manager_emp_id: true, status: true }
      })
      const existingMap = new Map(existing.map(d => [d.department_id, d]))
      const ops = []

      for (const d of rows) {
        const ext = existingMap.get(d.department_id)
        if (!ext ||
            ext.department_name !== d.department_name ||
            ext.cost_center !== d.cost_center ||
            ext.manager_emp_id !== d.manager_emp_id ||
            ext.status !== d.status
        ) {
          ops.push(prisma.department.upsert({
            where: { department_id: d.department_id },
            update: {
              department_name: d.department_name,
              cost_center: d.cost_center,
              manager_emp_id: d.manager_emp_id,
              status: d.status
            },
            create: {
              department_id: d.department_id,
              department_name: d.department_name,
              cost_center: d.cost_center,
              manager_emp_id: d.manager_emp_id,
              status: d.status,
              created_at: d.created_at || new Date().toISOString()
            }
          }))
        }
      }
      if (ops.length > 0) {
        await prisma.$transaction(ops)
      }
      count = rows.length
    }
    else if (sheet === 'positions') {
      const existing = await prisma.position.findMany({
        select: { position_id: true, position_name: true, level: true, salary_band_min: true, salary_band_max: true, status: true }
      })
      const existingMap = new Map(existing.map(p => [p.position_id, p]))
      const ops = []

      for (const p of rows) {
        const ext = existingMap.get(p.position_id)
        if (!ext ||
            ext.position_name !== p.position_name ||
            ext.level !== p.level ||
            ext.salary_band_min !== Number(p.salary_band_min) ||
            ext.salary_band_max !== Number(p.salary_band_max) ||
            ext.status !== p.status
        ) {
          ops.push(prisma.position.upsert({
            where: { position_id: p.position_id },
            update: {
              position_name: p.position_name,
              level: p.level,
              salary_band_min: Number(p.salary_band_min),
              salary_band_max: Number(p.salary_band_max),
              status: p.status
            },
            create: {
              position_id: p.position_id,
              position_name: p.position_name,
              level: p.level,
              salary_band_min: Number(p.salary_band_min),
              salary_band_max: Number(p.salary_band_max),
              status: p.status
            }
          }))
        }
      }
      if (ops.length > 0) {
        await prisma.$transaction(ops)
      }
      count = rows.length
    }
    else if (sheet === 'shifts') {
      const existing = await prisma.shift.findMany({
        select: { shift_id: true, shift_name: true, start_time: true, end_time: true, break_min: true, work_hours: true, status: true }
      })
      const existingMap = new Map(existing.map(s => [s.shift_id, s]))
      const ops = []

      for (const s of rows) {
        const ext = existingMap.get(s.shift_id)
        if (!ext ||
            ext.shift_name !== s.shift_name ||
            ext.start_time !== s.start_time ||
            ext.end_time !== s.end_time ||
            ext.break_min !== Number(s.break_min) ||
            ext.work_hours !== Number(s.work_hours) ||
            ext.status !== s.status
        ) {
          ops.push(prisma.shift.upsert({
            where: { shift_id: s.shift_id },
            update: {
              shift_name: s.shift_name,
              start_time: s.start_time,
              end_time: s.end_time,
              break_min: Number(s.break_min),
              work_hours: Number(s.work_hours),
              status: s.status
            },
            create: {
              shift_id: s.shift_id,
              shift_name: s.shift_name,
              start_time: s.start_time,
              end_time: s.end_time,
              break_min: Number(s.break_min),
              work_hours: Number(s.work_hours),
              status: s.status
            }
          }))
        }
      }
      if (ops.length > 0) {
        await prisma.$transaction(ops)
      }
      count = rows.length
    }
    else if (sheet === 'employees') {
      const existing = await prisma.employee.findMany({
        select: { employee_id: true, employee_code: true, full_name: true, gender: true, dob: true, phone: true, email: true, address: true, join_date: true, contract_type: true, base_salary: true, bank_account_no: true, status: true, department_id: true, position_id: true }
      })
      const existingMap = new Map(existing.map(e => [e.employee_id, e]))
      const ops = []

      for (const e of rows) {
        const ext = existingMap.get(e.employee_id)
        if (!ext ||
            ext.employee_code !== e.employee_code ||
            ext.full_name !== e.full_name ||
            ext.gender !== e.gender ||
            ext.dob !== e.dob ||
            ext.phone !== e.phone ||
            ext.email !== e.email ||
            ext.address !== e.address ||
            ext.join_date !== e.join_date ||
            ext.contract_type !== e.contract_type ||
            ext.base_salary !== Number(e.base_salary) ||
            ext.bank_account_no !== e.bank_account_no ||
            ext.status !== e.status ||
            ext.department_id !== e.department_id ||
            ext.position_id !== e.position_id
        ) {
          ops.push(prisma.employee.upsert({
            where: { employee_id: e.employee_id },
            update: {
              employee_code: e.employee_code,
              full_name: e.full_name,
              gender: e.gender,
              dob: e.dob,
              phone: e.phone,
              email: e.email,
              address: e.address,
              join_date: e.join_date,
              contract_type: e.contract_type,
              base_salary: Number(e.base_salary),
              bank_account_no: e.bank_account_no,
              status: e.status,
              department_id: e.department_id,
              position_id: e.position_id
            },
            create: {
              employee_id: e.employee_id,
              employee_code: e.employee_code,
              full_name: e.full_name,
              gender: e.gender,
              dob: e.dob,
              phone: e.phone,
              email: e.email,
              address: e.address,
              join_date: e.join_date,
              contract_type: e.contract_type,
              base_salary: Number(e.base_salary),
              bank_account_no: e.bank_account_no,
              status: e.status,
              department_id: e.department_id,
              position_id: e.position_id,
              created_at: e.created_at || new Date().toISOString()
            }
          }))
        }
      }
      if (ops.length > 0) {
        await prisma.$transaction(ops)
      }
      
      const incomingIds = rows.map(r => r.employee_id)
      await prisma.employee.deleteMany({
        where: { employee_id: { notIn: incomingIds } }
      }).catch(() => {})
      count = rows.length
    }
    else if (sheet === 'attendances') {
      const existing = await prisma.attendance.findMany({
        select: { attendance_id: true, work_date: true, check_in: true, check_out: true, work_minutes: true, overtime_minutes: true, status: true, note: true, checked_by: true, employee_id: true, shift_id: true }
      })
      const existingMap = new Map(existing.map(e => [e.attendance_id, e]))
      const ops = []

      for (const a of rows) {
        const ext = existingMap.get(a.attendance_id)
        const incomingWorkMinutes = a.work_minutes ? Number(a.work_minutes) : (Number(a.work_hours || 0) * 60)
        const incomingOvertimeMinutes = a.overtime_minutes ? Number(a.overtime_minutes) : (Number(a.overtime_hours || 0) * 60)

        if (!ext ||
            ext.work_date !== a.work_date ||
            ext.check_in !== a.check_in ||
            ext.check_out !== a.check_out ||
            ext.work_minutes !== incomingWorkMinutes ||
            ext.overtime_minutes !== incomingOvertimeMinutes ||
            ext.status !== a.status ||
            ext.note !== (a.note || '') ||
            ext.checked_by !== (a.checked_by || 'Admin Quản trị') ||
            ext.employee_id !== a.employee_id ||
            ext.shift_id !== a.shift_id
        ) {
          ops.push(prisma.attendance.upsert({
            where: { attendance_id: a.attendance_id },
            update: {
              work_date: a.work_date,
              check_in: a.check_in,
              check_out: a.check_out,
              work_minutes: incomingWorkMinutes,
              overtime_minutes: incomingOvertimeMinutes,
              status: a.status,
              note: a.note || '',
              checked_by: a.checked_by || 'Admin Quản trị',
              employee_id: a.employee_id,
              shift_id: a.shift_id
            },
            create: {
              attendance_id: a.attendance_id,
              work_date: a.work_date,
              check_in: a.check_in,
              check_out: a.check_out,
              work_minutes: incomingWorkMinutes,
              overtime_minutes: incomingOvertimeMinutes,
              late_minutes: 0,
              early_leave_minutes: 0,
              status: a.status,
              note: a.note || '',
              checked_by: a.checked_by || 'Admin Quản trị',
              employee_id: a.employee_id,
              shift_id: a.shift_id
            }
          }))
        }
      }
      if (ops.length > 0) {
        await prisma.$transaction(ops)
      }
      count = rows.length
    }
    else if (sheet === 'leaveRequests') {
      const existing = await prisma.leaveRequest.findMany({
        select: { leave_id: true, leave_type: true, from_date: true, to_date: true, days: true, reason: true, status: true, approved_by: true, employee_id: true }
      })
      const existingMap = new Map(existing.map(l => [l.leave_id, l]))
      const ops = []

      for (const l of rows) {
        const ext = existingMap.get(l.leave_id)
        if (!ext ||
            ext.leave_type !== l.leave_type ||
            ext.from_date !== l.from_date ||
            ext.to_date !== l.to_date ||
            ext.days !== Number(l.days) ||
            ext.reason !== (l.reason || '') ||
            ext.status !== l.status ||
            ext.approved_by !== (l.approved_by || '') ||
            ext.employee_id !== l.employee_id
        ) {
          ops.push(prisma.leaveRequest.upsert({
            where: { leave_id: l.leave_id },
            update: {
              leave_type: l.leave_type,
              from_date: l.from_date,
              to_date: l.to_date,
              days: Number(l.days),
              reason: l.reason || '',
              status: l.status,
              approved_by: l.approved_by || '',
              employee_id: l.employee_id,
            },
            create: {
              leave_id: l.leave_id,
              leave_type: l.leave_type,
              from_date: l.from_date,
              to_date: l.to_date,
              days: Number(l.days),
              reason: l.reason || '',
              status: l.status,
              approved_by: l.approved_by || '',
              created_at: l.created_at || new Date().toISOString(),
              employee_id: l.employee_id
            }
          }))
        }
      }
      if (ops.length > 0) {
        await prisma.$transaction(ops)
      }
      count = rows.length
    }
    else if (sheet === 'adjustments') {
      const existing = await prisma.adjustment.findMany({
        select: { adj_id: true, month: true, adj_type: true, amount: true, description: true, employee_id: true }
      })
      const existingMap = new Map(existing.map(a => [a.adj_id, a]))
      const ops = []

      for (const a of rows) {
        const ext = existingMap.get(a.adj_id)
        if (!ext ||
            ext.month !== a.month ||
            ext.adj_type !== a.adj_type ||
            ext.amount !== Number(a.amount) ||
            ext.description !== (a.description || '') ||
            ext.employee_id !== a.employee_id
        ) {
          ops.push(prisma.adjustment.upsert({
            where: { adj_id: a.adj_id },
            update: {
              month: a.month,
              adj_type: a.adj_type,
              amount: Number(a.amount),
              description: a.description || ''
            },
            create: {
              adj_id: a.adj_id,
              month: a.month,
              adj_type: a.adj_type,
              amount: Number(a.amount),
              description: a.description || '',
              created_at: a.created_at || new Date().toISOString(),
              employee_id: a.employee_id
            }
          }))
        }
      }
      if (ops.length > 0) {
        await prisma.$transaction(ops)
      }
      count = rows.length
    }
    else if (sheet === 'payrolls') {
      const uniqueMonths = Array.from(new Set(rows.map(p => p.month).filter(Boolean)))
      const periodOps = uniqueMonths.map(m => {
        const periodId = `PRP_${String(m).replace('-', '')}`
        return prisma.payrollPeriod.upsert({
          where: { period_id: periodId },
          update: {},
          create: {
            period_id: periodId,
            month: String(m).split('-')[1] || '01',
            year: String(m).split('-')[0] || '2026',
            state: 'PAID',
            created_at: new Date().toISOString()
          }
        })
      })
      await prisma.$transaction(periodOps)

      const existing = await prisma.payroll.findMany({
        select: { payroll_id: true, period_id: true, base_salary: true, work_days_standard: true, work_days_actual: true, overtime_hours: true, overtime_pay: true, allowance: true, deduction: true, gross_pay: true, insurance: true, pit: true, net_pay: true, pay_date: true, status: true, employee_id: true }
      })
      const existingMap = new Map(existing.map(p => [p.payroll_id, p]))
      const payrollOps = []

      for (const p of rows) {
        if (!p.month) continue
        const periodId = `PRP_${String(p.month).replace('-', '')}`
        const ext = existingMap.get(p.payroll_id)

        if (!ext ||
            ext.period_id !== periodId ||
            ext.base_salary !== Number(p.base_salary) ||
            ext.work_days_standard !== Number(p.work_days_standard) ||
            ext.work_days_actual !== Number(p.work_days_actual) ||
            ext.overtime_hours !== Number(p.overtime_hours) ||
            ext.overtime_pay !== Number(p.overtime_pay) ||
            ext.allowance !== Number(p.allowance) ||
            ext.deduction !== Number(p.deduction) ||
            ext.gross_pay !== Number(p.gross_pay) ||
            ext.insurance !== Number(p.insurance) ||
            ext.pit !== Number(p.pit) ||
            ext.net_pay !== Number(p.net_pay) ||
            ext.pay_date !== p.pay_date ||
            ext.status !== p.status ||
            ext.employee_id !== p.employee_id
        ) {
          payrollOps.push(prisma.payroll.upsert({
            where: { payroll_id: p.payroll_id },
            update: {
              period_id: periodId,
              base_salary: Number(p.base_salary),
              work_days_standard: Number(p.work_days_standard),
              work_days_actual: Number(p.work_days_actual),
              overtime_hours: Number(p.overtime_hours),
              overtime_pay: Number(p.overtime_pay),
              allowance: Number(p.allowance),
              deduction: Number(p.deduction),
              gross_pay: Number(p.gross_pay),
              insurance: Number(p.insurance),
              pit: Number(p.pit),
              net_pay: Number(p.net_pay),
              pay_date: p.pay_date,
              status: p.status
            },
            create: {
              payroll_id: p.payroll_id,
              period_id: periodId,
              version: 1,
              base_salary: Number(p.base_salary),
              work_days_standard: Number(p.work_days_standard),
              work_days_actual: Number(p.work_days_actual),
              overtime_hours: Number(p.overtime_hours),
              overtime_pay: Number(p.overtime_pay),
              allowance: Number(p.allowance),
              deduction: Number(p.deduction),
              gross_pay: Number(p.gross_pay),
              insurance: Number(p.insurance),
              pit: Number(p.pit),
              net_pay: Number(p.net_pay),
              pay_date: p.pay_date,
              status: p.status,
              employee_id: p.employee_id
            }
          }))
        }
      }
      if (payrollOps.length > 0) {
        await prisma.$transaction(payrollOps)
      }
      count = rows.length
    }
    else if (sheet === 'settings') {
      const existing = await prisma.systemSetting.findMany({
        select: { setting_id: true, setting_key: true, setting_value: true, setting_type: true, description: true }
      })
      const existingMap = new Map(existing.map(s => [s.setting_id, s]))
      const ops = []

      for (const s of rows) {
        const ext = existingMap.get(s.setting_id)
        if (!ext ||
            ext.setting_key !== s.setting_key ||
            ext.setting_value !== String(s.setting_value) ||
            ext.setting_type !== s.setting_type ||
            ext.description !== (s.description || '')
        ) {
          ops.push(prisma.systemSetting.upsert({
            where: { setting_id: s.setting_id },
            update: {
              setting_key: s.setting_key,
              setting_value: String(s.setting_value),
              setting_type: s.setting_type,
              description: s.description || '',
              updated_at: new Date().toISOString()
            },
            create: {
              setting_id: s.setting_id,
              setting_key: s.setting_key,
              setting_value: String(s.setting_value),
              setting_type: s.setting_type,
              description: s.description || '',
              updated_at: new Date().toISOString()
            }
          }))
        }
      }
      if (ops.length > 0) {
        await prisma.$transaction(ops)
      }
      count = rows.length
    }

    return NextResponse.json({ ok: true, sheet, count })
  } catch (err: any) {
    console.error('[API/data POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
