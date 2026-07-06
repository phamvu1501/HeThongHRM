import { PrismaClient, Attendance, PayrollPeriod } from '@prisma/client'

const prisma = new PrismaClient()

// ─── UTILS ───────────────────────────────────────────────────────────────────────

/** Chuyển đổi "HH:mm" sang tổng số phút kể từ 00:00 */
function parseTimeToMinutes(timeStr: string | null | undefined): number {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Chuyển phút thành "HH:mm" */
function formatMinutesToTime(totalMins: number): string {
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

/** 
 * Kiểm tra xem kỳ lương ứng với một ngày (YYYY-MM-DD) đã khóa chưa
 */
async function isPeriodLockedForDate(dateStr: string): Promise<boolean> {
  const dateObj = new Date(dateStr)
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
  const year = dateObj.getFullYear().toString()
  
  const period = await prisma.payrollPeriod.findFirst({
    where: { month, year }
  })
  
  if (!period) return false // Nếu chưa có kỳ lương thì coi như chưa khóa
  return period.state === 'LOCKED' || period.state === 'PAID'
}

// ─── 1. B.1 XÁC ĐỊNH TRẠNG THÁI CHẤM CÔNG (determineAttendance) ───────────────

export async function determineAttendance(attendanceId: string) {
  // 1. Load bản ghi Attendance
  const attendance = await prisma.attendance.findUnique({
    where: { attendance_id: attendanceId },
    include: { shift: true }
  })

  if (!attendance) throw new Error('Không tìm thấy bản ghi chấm công')

  // 2. Load kỳ lương ứng với ngày làm việc
  const isLocked = await isPeriodLockedForDate(attendance.work_date)
  if (isLocked) {
    throw new Error('Kỳ lương của ngày này đã bị KHÓA hoặc ĐÃ THANH TOÁN, không thể cập nhật chấm công.')
  }

  // 3. Kiểm tra xem có đơn xin nghỉ được duyệt vào ngày này không
  const approvedLeave = await prisma.leaveRequest.findFirst({
    where: {
      employee_id: attendance.employee_id,
      status: 'Đã duyệt',
      // Trong thực tế, cần so sánh khoảng from_date <= work_date <= to_date
      from_date: { lte: attendance.work_date },
      to_date: { gte: attendance.work_date }
    }
  })

  if (approvedLeave) {
    return await prisma.attendance.update({
      where: { attendance_id: attendanceId },
      data: { status: 'Nghỉ phép', note: 'Có đơn xin nghỉ được duyệt' }
    })
  }

  // 4. Nếu không có checkIn và checkOut -> ABSENT (Vắng mặt)
  if (!attendance.check_in && !attendance.check_out) {
    return await prisma.attendance.update({
      where: { attendance_id: attendanceId },
      data: { status: 'Vắng mặt', work_minutes: 0 }
    })
  }

  // 5. Nếu có checkIn nhưng không có checkOut -> MISSING_CHECKOUT
  if (attendance.check_in && !attendance.check_out) {
    // Tạo cảnh báo
    await prisma.attendanceAlert.create({
      data: {
        alert_id: `ALT_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        severity: 'HIGH',
        status: 'PENDING',
        created_at: new Date().toISOString(),
        attendance_id: attendanceId
      }
    })
    return await prisma.attendance.update({
      where: { attendance_id: attendanceId },
      data: { status: 'Thiếu check-out' }
    })
  }

  // 6. Tính toán giờ làm, đi trễ, về sớm, tăng ca
  const shift = attendance.shift
  if (!shift) throw new Error('Không tìm thấy ca làm việc')

  const checkInMin = parseTimeToMinutes(attendance.check_in)
  const checkOutMin = parseTimeToMinutes(attendance.check_out)
  const shiftStartMin = parseTimeToMinutes(shift.start_time)
  const shiftEndMin = parseTimeToMinutes(shift.end_time)
  const gracePeriod = 15 // Thời gian du di (phút)

  // Validate overnight shift & checkout
  if (checkOutMin < checkInMin) {
    // Nếu checkOut < checkIn (ví dụ qua ngày) -> Phải chuẩn hóa. 
    // Trong ví dụ này, đơn giản hóa ném lỗi hoặc cộng 24h.
    throw new Error('Check-out không hợp lệ (nhỏ hơn check-in)')
  }

  const late = Math.max(0, checkInMin - shiftStartMin - gracePeriod)
  const earlyLeave = Math.max(0, shiftEndMin - checkOutMin - gracePeriod)
  
  // Tính tổng thời gian làm việc (trừ đi thời gian nghỉ giữa ca)
  const totalWorkMin = Math.max(0, checkOutMin - checkInMin - (shift.break_min || 0))
  
  // Tính overtime: những phút làm thêm sau khi ca làm việc kết thúc
  const overtime = Math.max(0, checkOutMin - shiftEndMin)

  const status = late > 0 ? 'Đi trễ' : 'Đúng giờ'

  // Cập nhật lại bản ghi
  return await prisma.attendance.update({
    where: { attendance_id: attendanceId },
    data: {
      late_minutes: late,
      early_leave_minutes: earlyLeave,
      work_minutes: totalWorkMin,
      overtime_minutes: overtime,
      status: status
    }
  })
}

// ─── 2. B.2 PHÊ DUYỆT ĐƠN NGHỈ (approveLeave) ──────────────────────────────────

export async function approveLeave(leaveId: string, actorId: string) {
  // Bắt đầu Transaction
  return await prisma.$transaction(async (tx) => {
    // 1. Load và lock request (Prisma không hỗ trợ row-level lock dễ dàng như SQL thô, dùng findUnique)
    const request = await tx.leaveRequest.findUnique({
      where: { leave_id: leaveId }
    })

    if (!request || request.status !== 'Chờ duyệt') {
      throw new Error('Đơn nghỉ không tồn tại hoặc không ở trạng thái Chờ duyệt')
    }

    // 2. Authorize actor (giả lập: kiểm tra actor có quyền duyệt không)
    // Trong thực tế sẽ gọi: authorize(actorId, request.employee_id)
    
    // 3. Update request -> APPROVED
    await tx.leaveRequest.update({
      where: { leave_id: leaveId },
      data: { status: 'Đã duyệt', approved_by: actorId }
    })

    // 4. Lấy khoảng ngày (từ from_date đến to_date)
    // Giả định from_date và to_date có định dạng YYYY-MM-DD
    const start = new Date(request.from_date)
    const end = new Date(request.to_date)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      
      // 4a. Kiểm tra kỳ lương
      const isLocked = await isPeriodLockedForDate(dateStr)
      if (isLocked) {
        throw new Error(`Kỳ lương của ngày ${dateStr} đã bị KHÓA. Không thể duyệt đơn nghỉ.`)
      }

      // 4b. Tìm bản ghi chấm công của ngày đó
      const attendance = await tx.attendance.findFirst({
        where: { employee_id: request.employee_id, work_date: dateStr }
      })

      if (attendance) {
        if (attendance.check_in || attendance.check_out) {
          // Xung đột: ngày này nhân viên đã đi làm (có quét vân tay)
          await tx.attendanceAlert.create({
            data: {
              alert_id: `ALT_${Date.now()}_${Math.floor(Math.random()*1000)}`,
              severity: 'HIGH',
              status: 'PENDING',
              created_at: new Date().toISOString(),
              attendance_id: attendance.attendance_id
            }
          })
          // Gắn thêm log để ghi nhận xung đột
          await tx.systemLog.create({
             data: {
                log_id: `LOG_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                log_time: new Date().toISOString(),
                user: actorId,
                action: 'LEAVE_CONFLICT_ALERT',
                entity_type: 'Attendance',
                entity_id: attendance.attendance_id,
                description: `Phát hiện có check-in/out thực tế vào ngày nghỉ được duyệt (${dateStr})`
             }
          })
        } else {
          // Update status thành Nghỉ phép
          await tx.attendance.update({
            where: { attendance_id: attendance.attendance_id },
            data: { status: 'Nghỉ phép', note: 'Nghỉ phép có phép' }
          })
        }
      } else {
        // Nếu chưa có record chấm công, tạo mới
        // Lấy ca làm việc mặc định của nhân viên để gán vào
        const assignment = await tx.shiftAssignment.findFirst({
           where: { employee_id: request.employee_id }
        })
        const shiftId = assignment ? assignment.shift_id : 'S001'
        
        await tx.attendance.create({
          data: {
            attendance_id: `ATT_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            work_date: dateStr,
            check_in: '',
            check_out: '',
            status: 'Nghỉ phép',
            note: 'Nghỉ phép có phép',
            employee_id: request.employee_id,
            shift_id: shiftId
          }
        })
      }
    }

    // 5. Ghi Audit Log
    await tx.systemLog.create({
      data: {
        log_id: `LOG_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        log_time: new Date().toISOString(),
        user: actorId,
        action: 'APPROVE_LEAVE',
        entity_type: 'LeaveRequest',
        entity_id: leaveId,
        description: `Đã duyệt đơn xin nghỉ cho nhân viên ID: ${request.employee_id}`
      }
    })
  })
}

// ─── 3. B.3 TÍNH VÀ KHÓA BẢNG LƯƠNG (calculatePayroll, lockPeriod) ─────────────

export async function calculatePayroll(employeeId: string, periodId: string, actorId?: string) {
  // 1. Load kỳ lương
  const period = await prisma.payrollPeriod.findUnique({
    where: { period_id: periodId }
  })
  if (!period) throw new Error('Không tìm thấy kỳ lương')
  if (period.state === 'LOCKED' || period.state === 'PAID') {
     throw new Error('Kỳ lương này đã bị KHÓA, không thể tính toán lại.')
  }

  const [yearStr, monthStr] = [period.year, period.month]

  // 2. Tìm Base Salary
  const employee = await prisma.employee.findUnique({
    where: { employee_id: employeeId }
  })
  if (!employee) throw new Error('Không tìm thấy nhân viên')
  const baseSalary = employee.base_salary

  // 3. Tổng hợp chuyên cần (Attendance) trong tháng
  const startDate = `${yearStr}-${monthStr}-01`
  const endDate = `${yearStr}-${monthStr}-31` // Xấp xỉ, truy vấn DB theo chuỗi

  const attendances = await prisma.attendance.findMany({
    where: {
      employee_id: employeeId,
      work_date: {
        gte: startDate,
        lte: endDate
      }
    }
  })

  let actualDays = 0
  let overtimeMins = 0

  for (const att of attendances) {
    if (att.status === 'Đúng giờ' || att.status === 'Đi trễ' || att.status === 'Nghỉ phép') {
      actualDays += 1
    } else if (att.status === 'Về sớm') {
      actualDays += 0.5 // Ví dụ logic: Về sớm tính nửa ngày
    }
    overtimeMins += att.overtime_minutes || 0
  }

  const standardDays = 22 // Cấu hình ngày công chuẩn
  const salaryByWork = Math.round((baseSalary / standardDays) * actualDays)

  // 4. Tính làm thêm giờ (Overtime)
  const configuredRate = 1.5
  const overtimePay = Math.round((overtimeMins / 60) * (baseSalary / standardDays / 8) * configuredRate)

  // 5. Tính các khoản Phụ cấp / Khấu trừ (Adjustments)
  const adjustments = await prisma.adjustment.findMany({
    where: {
      employee_id: employeeId,
      month: `${yearStr}-${monthStr}` // Định dạng YYYY-MM
    }
  })

  let income = 0
  let deduction = 0
  for (const adj of adjustments) {
    if (adj.adj_type === 'ALLOWANCE' || adj.adj_type === 'BONUS' || adj.amount > 0) {
      income += adj.amount
    } else {
      deduction += Math.abs(adj.amount)
    }
  }

  // Thuế và bảo hiểm mặc định
  const insuranceTax = baseSalary * 0.105 // 10.5% bảo hiểm
  deduction += insuranceTax

  // 6. Tính Gross và Net
  const gross = salaryByWork + overtimePay + income
  const net = gross - deduction

  // 7. Lưu (hoặc update) Snapshot
  const existingPayroll = await prisma.payroll.findFirst({
    where: { employee_id: employeeId, period_id: periodId }
  })

  if (existingPayroll) {
    const updated = await prisma.payroll.update({
      where: { payroll_id: existingPayroll.payroll_id },
      data: {
        version: existingPayroll.version + 1,
        base_salary: baseSalary,
        work_days_standard: standardDays,
        work_days_actual: actualDays,
        overtime_hours: Math.round((overtimeMins / 60) * 100) / 100,
        overtime_pay: overtimePay,
        allowance: income,
        deduction: deduction,
        gross_pay: gross,
        insurance: insuranceTax,
        pit: 0, // Tính thuế thu nhập cá nhân nếu cần
        net_pay: net,
        status: 'Chưa thanh toán'
      }
    })

    if (actorId) {
      await prisma.systemLog.create({
        data: {
          log_id: `LOG_${Date.now()}_${Math.floor(Math.random()*1000)}`,
          log_time: new Date().toISOString(),
          user: actorId,
          action: 'RECALCULATE_PAYROLL',
          entity_type: 'Payroll',
          entity_id: updated.payroll_id,
          description: `Đã tính lại lương cho nhân viên ${employeeId} (Version ${updated.version})`
        }
      })
    }
    return updated
  } else {
    return await prisma.payroll.create({
      data: {
        payroll_id: `PR_${employeeId}_${yearStr}${monthStr}`,
        version: 1,
        base_salary: baseSalary,
        work_days_standard: standardDays,
        work_days_actual: actualDays,
        overtime_hours: Math.round((overtimeMins / 60) * 100) / 100,
        overtime_pay: overtimePay,
        allowance: income,
        deduction: deduction,
        gross_pay: gross,
        insurance: insuranceTax,
        pit: 0,
        net_pay: net,
        pay_date: '',
        status: 'Chưa thanh toán',
        employee_id: employeeId,
        period_id: periodId
      }
    })
  }
}

export async function lockPeriod(periodId: string, lockedByActor: string) {
  // 1. Load PayrollPeriod
  const period = await prisma.payrollPeriod.findUnique({
    where: { period_id: periodId }
  })
  if (!period) throw new Error('Không tìm thấy kỳ lương')

  // 2. Validate "no negative net"
  const payrolls = await prisma.payroll.findMany({
    where: { period_id: periodId }
  })

  for (const pr of payrolls) {
    if (pr.net_pay < 0) {
      throw new Error(`Bảng lương của nhân viên ${pr.employee_id} đang có giá trị âm. Không thể khóa.`)
    }
  }

  // 3. Validate "Critical alerts resolved" (Tìm các cảnh báo chấm công trong kỳ này)
  const alerts = await prisma.attendanceAlert.findMany({
    where: {
       status: 'PENDING',
       attendance: {
          work_date: { startsWith: `${period.year}-${period.month}` }
       }
    }
  })
  if (alerts.length > 0) {
     throw new Error('Còn cảnh báo chấm công (Alerts) chưa xử lý. Không thể khóa kỳ lương.')
  }

  // 4. Lock state
  await prisma.payrollPeriod.update({
    where: { period_id: periodId },
    data: {
      state: 'LOCKED',
      locked_by: lockedByActor,
      locked_at: new Date().toISOString()
    }
  })

  // 5. Write audit log
  await prisma.systemLog.create({
    data: {
      log_id: `LOG_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      log_time: new Date().toISOString(),
      user: lockedByActor,
      action: 'LOCK_PAYROLL_PERIOD',
      entity_type: 'PayrollPeriod',
      entity_id: periodId,
      description: `Đã KHÓA kỳ lương tháng ${period.month}/${period.year}`
    }
  })

  return { success: true, message: 'Đã khóa bảng lương thành công.' }
}

// ─── 4. ĐIỀU CHỈNH & MỞ KHÓA (unlockPeriod, createAdjustment) ─────────────────

export async function unlockPeriod(periodId: string, actorId: string, reason: string) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { period_id: periodId }
  })
  if (!period) throw new Error('Không tìm thấy kỳ lương')
  if (period.state !== 'LOCKED' && period.state !== 'PAID') {
    throw new Error('Kỳ lương chưa bị khóa.')
  }

  await prisma.payrollPeriod.update({
    where: { period_id: periodId },
    data: {
      state: 'OPEN',
      locked_by: null,
      locked_at: null
    }
  })

  await prisma.systemLog.create({
    data: {
      log_id: `LOG_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      log_time: new Date().toISOString(),
      user: actorId,
      action: 'UNLOCK_PAYROLL_PERIOD',
      entity_type: 'PayrollPeriod',
      entity_id: periodId,
      description: `Đã MỞ LẠI kỳ lương tháng ${period.month}/${period.year}. Lý do: ${reason}`
    }
  })

  return { success: true, message: 'Đã mở khóa kỳ lương thành công.' }
}

export async function createAdjustment(employeeId: string, monthStr: string, adjType: string, amount: number, description: string, actorId: string) {
  // Kiểm tra xem kỳ lương đã bị khóa chưa (ví dụ monthStr = "2026-06")
  const [year, month] = monthStr.split('-')
  const period = await prisma.payrollPeriod.findFirst({
    where: { month, year }
  })

  if (period && (period.state === 'LOCKED' || period.state === 'PAID')) {
    throw new Error(`Kỳ lương tháng ${monthStr} đã bị khóa. Vui lòng tạo khoản điều chỉnh sang kỳ lương sau.`)
  }

  const adjId = `ADJ_${Date.now()}_${Math.floor(Math.random()*1000)}`
  const newAdj = await prisma.adjustment.create({
    data: {
      adj_id: adjId,
      month: monthStr,
      adj_type: adjType,
      amount: amount,
      description: description,
      created_at: new Date().toISOString(),
      employee_id: employeeId
    }
  })

  await prisma.systemLog.create({
    data: {
      log_id: `LOG_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      log_time: new Date().toISOString(),
      user: actorId,
      action: 'CREATE_ADJUSTMENT',
      entity_type: 'Adjustment',
      entity_id: adjId,
      description: `Đã thêm khoản điều chỉnh ${amount} cho nhân viên ${employeeId} vào tháng ${monthStr}`
    }
  })

  return newAdj
}
