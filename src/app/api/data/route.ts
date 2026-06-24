import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
      prisma.systemLog.findMany(),
      
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
    
    // --- 1. LƯU LÊN POSTGRESQL (PRISMA) ---
    if (sheet === 'departments') {
      for (const d of rows) {
        await prisma.department.upsert({
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
        })
      }
      count = rows.length
    }
    else if (sheet === 'positions') {
      for (const p of rows) {
        await prisma.position.upsert({
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
        })
      }
      count = rows.length
    }
    else if (sheet === 'shifts') {
      for (const s of rows) {
        await prisma.shift.upsert({
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
        })
      }
      count = rows.length
    }
    else if (sheet === 'employees') {
      for (const e of rows) {
        await prisma.employee.upsert({
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
        })
        
        // Auto-create history on UI updates is complex via this generic import.
        // We'll leave the sync as-is for the mock data sheet import but handle the single-save below or in the UI POST.
      }
      const incomingIds = rows.map(r => r.employee_id)
      await prisma.employee.deleteMany({
        where: { employee_id: { notIn: incomingIds } }
      }).catch(() => {})
      count = rows.length
    }
    else if (sheet === 'attendances') {
      for (const a of rows) {
        await prisma.attendance.upsert({
          where: { attendance_id: a.attendance_id },
          update: {
            work_date: a.work_date,
            check_in: a.check_in,
            check_out: a.check_out,
            work_minutes: a.work_minutes ? Number(a.work_minutes) : (Number(a.work_hours || 0) * 60),
            overtime_minutes: a.overtime_minutes ? Number(a.overtime_minutes) : (Number(a.overtime_hours || 0) * 60),
            status: a.status,
            note: a.note || '',
            employee_id: a.employee_id,
            shift_id: a.shift_id
          },
          create: {
            attendance_id: a.attendance_id,
            work_date: a.work_date,
            check_in: a.check_in,
            check_out: a.check_out,
            work_minutes: a.work_minutes ? Number(a.work_minutes) : (Number(a.work_hours || 0) * 60),
            overtime_minutes: a.overtime_minutes ? Number(a.overtime_minutes) : (Number(a.overtime_hours || 0) * 60),
            late_minutes: 0,
            early_leave_minutes: 0,
            status: a.status,
            note: a.note || '',
            employee_id: a.employee_id,
            shift_id: a.shift_id
          }
        })
      }
      count = rows.length
    }
    else if (sheet === 'leaveRequests') {
      for (const l of rows) {
        await prisma.leaveRequest.upsert({
          where: { leave_id: l.leave_id },
          update: {
            leave_type: l.leave_type,
            from_date: l.from_date,
            to_date: l.to_date,
            days: Number(l.days),
            reason: l.reason || '',
            status: l.status,
            approved_by: l.approved_by || '',
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
        })
      }
      count = rows.length
    }
    else if (sheet === 'adjustments') {
       for (const a of rows) {
          await prisma.adjustment.upsert({
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
          })
       }
       count = rows.length
    }
    else if (sheet === 'payrolls') {
       for (const p of rows) {
          if (!p.month) continue;
          
          // Ensure period exists
          const periodId = `PRP_${String(p.month).replace('-', '')}`
          await prisma.payrollPeriod.upsert({
             where: { period_id: periodId },
             update: {},
             create: {
                period_id: periodId,
                month: String(p.month).split('-')[1] || '01',
                year: String(p.month).split('-')[0] || '2026',
                state: 'PAID',
                created_at: new Date().toISOString()
             }
          })

          await prisma.payroll.upsert({
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
          })
       }
       count = rows.length
    }
    else if (sheet === 'settings') {
       for (const s of rows) {
          await prisma.systemSetting.upsert({
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
          })
       }
       count = rows.length
    }

    return NextResponse.json({ ok: true, sheet, count })
  } catch (err: any) {
    console.error('[API/data POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
