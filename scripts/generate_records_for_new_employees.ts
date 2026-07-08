import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Bắt đầu sinh dữ liệu liên quan cho 200 nhân viên mới ---')

  const shifts = await prisma.shift.findMany()
  const depts = await prisma.department.findMany()
  const positions = await prisma.position.findMany()

  if (shifts.length === 0) {
    console.error('Không tìm thấy ca làm việc. Hãy chạy seed trước.')
    return
  }

  // Lấy danh sách 200 nhân viên mới (các EMP-000054 trở đi)
  const allEmployees = await prisma.employee.findMany()
  const newEmployees = allEmployees.filter(e => {
    const idMatch = e.employee_id.match(/\d+/)
    if (idMatch) {
      const num = parseInt(idMatch[0])
      return num >= 54
    }
    return false
  })

  console.log(`Tìm thấy: ${newEmployees.length} nhân viên mới cần bổ sung dữ liệu.`)

  const dateNow = new Date().toISOString()
  const todayStr = '2026-07-08' // Ngày hôm nay theo yêu cầu người dùng

  // --- 1. SINH SALARY HISTORY VÀ SHIFT ASSIGNMENT (NẾU CHƯA CÓ) ---
  console.log('1. Đồng bộ Lịch sử lương và Gán ca làm việc...')
  
  const salaryHistoriesToCreate = []
  const shiftAssignmentsToCreate = []

  for (const emp of newEmployees) {
    const shExists = await prisma.salaryHistory.findFirst({
      where: { employee_id: emp.employee_id }
    })
    if (!shExists) {
      salaryHistoriesToCreate.push({
        amount: emp.base_salary,
        effective_from: emp.join_date,
        created_at: dateNow,
        employee_id: emp.employee_id
      })
    }

    const saExists = await prisma.shiftAssignment.findFirst({
      where: { employee_id: emp.employee_id }
    })
    if (!saExists) {
      // Gán ca làm việc ngẫu nhiên từ danh sách ca
      const randomShift = shifts[Math.floor(Math.random() * shifts.length)]
      shiftAssignmentsToCreate.push({
        effective_from: emp.join_date,
        created_at: dateNow,
        employee_id: emp.employee_id,
        shift_id: randomShift.shift_id
      })
    }
  }

  if (salaryHistoriesToCreate.length > 0) {
    await prisma.salaryHistory.createMany({ data: salaryHistoriesToCreate })
    console.log(`Đã gán ${salaryHistoriesToCreate.length} Lịch sử lương mới.`)
  }
  if (shiftAssignmentsToCreate.length > 0) {
    await prisma.shiftAssignment.createMany({ data: shiftAssignmentsToCreate })
    console.log(`Đã gán ${shiftAssignmentsToCreate.length} Ca làm việc mặc định mới.`)
  }

  // Lấy các gán ca làm việc thực tế vừa tạo để dùng cho chấm công
  const assignments = await prisma.shiftAssignment.findMany()
  const assignmentMap = new Map(assignments.map(a => [a.employee_id, a.shift_id]))

  // --- 2. SINH CHẤM CÔNG NGÀY HÔM NAY (2026-07-08) ---
  console.log(`2. Sinh chấm công cho ngày hôm nay (${todayStr})...`)

  // Lấy ID chấm công cao nhất
  const atts = await prisma.attendance.findMany({ select: { attendance_id: true } })
  let maxAttId = 0
  for (const a of atts) {
    const num = parseInt(a.attendance_id.replace(/\D/g, '') || '0')
    if (num > maxAttId) maxAttId = num
  }

  const attendancesToCreate = []
  let attCounter = 1

  for (const emp of newEmployees) {
    // Kiểm tra xem đã chấm công ngày hôm nay chưa
    const exists = await prisma.attendance.findFirst({
      where: { employee_id: emp.employee_id, work_date: todayStr }
    })
    if (exists) continue

    const shiftId = assignmentMap.get(emp.employee_id) || shifts[0].shift_id
    const shift = shifts.find(s => s.shift_id === shiftId) || shifts[0]

    // Tính toán giờ chấm công thực tế ngẫu nhiên
    const rand = Math.random()
    let check_in = ''
    let check_out = ''
    let status = 'Đúng giờ'
    let note = ''
    let work_minutes = 0
    let overtime_minutes = 0
    let late_minutes = 0
    let early_leave_minutes = 0

    if (rand < 0.85) {
      // 85% đi làm đúng giờ
      check_in = `${todayStr} ${shift.start_time}`
      check_out = `${todayStr} ${shift.end_time}`
      work_minutes = shift.work_hours * 60
      status = 'Đúng giờ'
      note = 'Đúng giờ'
    } else if (rand < 0.92) {
      // 7% đi trễ
      const late = Math.floor(5 + Math.random() * 35)
      const [hStart, mStart] = shift.start_time.split(':').map(Number)
      const totalMin = hStart * 60 + mStart + late
      const hIn = String(Math.floor(totalMin / 60)).padStart(2, '0')
      const mIn = String(totalMin % 60).padStart(2, '0')

      check_in = `${todayStr} ${hIn}:${mIn}`
      check_out = `${todayStr} ${shift.end_time}`
      work_minutes = (shift.work_hours * 60) - late
      late_minutes = late
      status = 'Đi trễ'
      note = 'Đi muộn do kẹt xe'
    } else if (rand < 0.96) {
      // 4% về sớm
      const early = Math.floor(5 + Math.random() * 30)
      const [hEnd, mEnd] = shift.end_time.split(':').map(Number)
      const totalMin = hEnd * 60 + mEnd - early
      const hOut = String(Math.floor(totalMin / 60)).padStart(2, '0')
      const mOut = String(totalMin % 60).padStart(2, '0')

      check_in = `${todayStr} ${shift.start_time}`
      check_out = `${todayStr} ${hOut}:${mOut}`
      work_minutes = (shift.work_hours * 60) - early
      early_leave_minutes = early
      status = 'Về sớm'
      note = 'Về sớm giải quyết việc cá nhân'
    } else if (rand < 0.98) {
      // 2% tăng ca (> 60 phút)
      const ot = Math.floor(70 + Math.random() * 60)
      const [hEnd, mEnd] = shift.end_time.split(':').map(Number)
      const totalMin = hEnd * 60 + mEnd + ot
      const hOut = String(Math.floor(totalMin / 60)).padStart(2, '0')
      const mOut = String(totalMin % 60).padStart(2, '0')

      check_in = `${todayStr} ${shift.start_time}`
      check_out = `${todayStr} ${hOut}:${mOut}`
      work_minutes = shift.work_hours * 60
      overtime_minutes = ot
      status = 'Tăng ca'
      note = 'Tăng ca hoàn thành công việc dự án'
    } else {
      // 2% vắng mặt
      status = 'Vắng mặt'
      note = 'Nghỉ không phép'
    }

    const nextId = maxAttId + attCounter
    attCounter++

    attendancesToCreate.push({
      attendance_id: `ATT-${String(nextId).padStart(6, '0')}`,
      work_date: todayStr,
      check_in,
      check_out,
      work_minutes,
      overtime_minutes,
      late_minutes,
      early_leave_minutes,
      status,
      note,
      checked_by: 'Admin Quản trị',
      employee_id: emp.employee_id,
      shift_id: shift.shift_id
    })
  }

  if (attendancesToCreate.length > 0) {
    await prisma.attendance.createMany({ data: attendancesToCreate })
    console.log(`Đã tạo ${attendancesToCreate.length} bản ghi chấm công cho ngày hôm nay.`)
  }

  // --- 3. SINH ĐƠN TỪ (LEAVE REQUESTS) ---
  console.log('3. Sinh đơn từ (nghỉ phép/nghỉ ốm)...')

  const leaves = await prisma.leaveRequest.findMany({ select: { leave_id: true } })
  let maxLeaveId = 0
  for (const l of leaves) {
    const num = parseInt(l.leave_id.replace(/\D/g, '') || '0')
    if (num > maxLeaveId) maxLeaveId = num
  }

  const leaveTypes = ['Nghỉ phép năm', 'Nghỉ ốm', 'Việc riêng', 'Nghỉ không lương']
  const reasons = [
    'Giải quyết việc cá nhân gia đình',
    'Khám bệnh định kỳ tại bệnh viện',
    'Nghỉ phép du lịch cùng gia đình',
    'Sốt cao, đau họng cần nghỉ ngơi'
  ]
  const leaveStatuses = ['Đã duyệt', 'Chờ duyệt', 'Từ chối']

  // Chọn ngẫu nhiên 15 nhân viên để tạo đơn xin nghỉ phép trong tháng 7/2026
  const shuffledEmps = [...newEmployees].sort(() => 0.5 - Math.random())
  const leaveEmps = shuffledEmps.slice(0, 15)

  const leavesToCreate = []
  let leaveCounter = 1

  for (const emp of leaveEmps) {
    const nextId = maxLeaveId + leaveCounter
    leaveCounter++

    const randType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)]
    const randReason = reasons[Math.floor(Math.random() * reasons.length)]
    const randStatus = leaveStatuses[Math.floor(Math.random() * leaveStatuses.length)]
    
    // Gán thời gian nghỉ (quanh ngày hôm nay hoặc trong tháng 7/2026)
    const dayOffset = Math.floor(-5 + Math.random() * 10)
    const fromDateObj = new Date()
    fromDateObj.setDate(fromDateObj.getDate() + dayOffset)
    const toDateObj = new Date(fromDateObj)
    const days = Math.floor(1 + Math.random() * 2)
    toDateObj.setDate(toDateObj.getDate() + (days - 1))

    leavesToCreate.push({
      leave_id: `L-${String(nextId).padStart(4, '0')}`,
      leave_type: randType,
      from_date: fromDateObj.toISOString().slice(0, 10),
      to_date: toDateObj.toISOString().slice(0, 10),
      days: days,
      reason: randReason,
      status: randStatus,
      approved_by: randStatus === 'Đã duyệt' ? 'EMP-000001' : '',
      created_at: dateNow,
      employee_id: emp.employee_id
    })
  }

  if (leavesToCreate.length > 0) {
    await prisma.leaveRequest.createMany({ data: leavesToCreate })
    console.log(`Đã tạo ${leavesToCreate.length} đơn từ nghỉ phép.`)
  }

  // --- 4. SINH PHỤ CẤP VÀ KHẤU TRỪ (ADJUSTMENTS) ---
  console.log('4. Sinh phụ cấp và khấu trừ cho tháng 7/2026...')

  const adjs = await prisma.adjustment.findMany({ select: { adj_id: true } })
  let maxAdjId = 0
  for (const a of adjs) {
    const num = parseInt(a.adj_id.replace(/\D/g, '') || '0')
    if (num > maxAdjId) maxAdjId = num
  }

  const adjTypes = [
    { type: 'Phụ cấp dự án', isPos: true },
    { type: 'Thưởng hiệu suất', isPos: true },
    { type: 'Phụ cấp xăng xe', isPos: true },
    { type: 'Khấu trừ đi trễ', isPos: false },
    { type: 'Khấu trừ đồng phục', isPos: false }
  ]

  // Chọn ngẫu nhiên 45 nhân viên để phát sinh phụ cấp/khấu trừ
  const adjEmps = shuffledEmps.slice(0, 45)
  const adjsToCreate = []
  let adjCounter = 1

  for (const emp of adjEmps) {
    const nextId = maxAdjId + adjCounter
    adjCounter++

    const at = adjTypes[Math.floor(Math.random() * adjTypes.length)]
    const amount = at.isPos
      ? Math.floor(500000 + Math.random() * 1500000)
      : Math.floor(100000 + Math.random() * 300000)

    adjsToCreate.push({
      adj_id: `ADJ-${String(nextId).padStart(6, '0')}`,
      month: '2026-07',
      adj_type: at.type,
      amount: amount,
      description: at.isPos ? `Thưởng hoàn thành tiến độ` : `Khấu trừ theo nội quy công ty`,
      created_at: dateNow,
      employee_id: emp.employee_id
    })
  }

  if (adjsToCreate.length > 0) {
    await prisma.adjustment.createMany({ data: adjsToCreate })
    console.log(`Đã tạo ${adjsToCreate.length} khoản phụ cấp/khấu trừ.`)
  }

  // --- 5. SINH BẢNG LƯƠNG THÁNG 6/2026 (PAYROLLS) ---
  console.log('5. Sinh bảng lương Tháng 6/2026 hoàn chỉnh...')

  // Đảm bảo Period PRP_202606 đã tồn tại
  const periodId = 'PRP_202606'
  await prisma.payrollPeriod.upsert({
    where: { period_id: periodId },
    update: {},
    create: {
      period_id: periodId,
      month: '06',
      year: '2026',
      state: 'PAID',
      created_at: dateNow
    }
  })

  const pays = await prisma.payroll.findMany({ select: { payroll_id: true } })
  let maxPayId = 0
  for (const p of pays) {
    const num = parseInt(p.payroll_id.replace(/\D/g, '') || '0')
    if (num > maxPayId) maxPayId = num
  }

  const payrollsToCreate = []
  let payCounter = 1

  for (const emp of newEmployees) {
    // Kiểm tra xem đã có bảng lương tháng 6 chưa
    const exists = await prisma.payroll.findFirst({
      where: { employee_id: emp.employee_id, period_id: periodId }
    })
    if (exists) continue

    const nextId = maxPayId + payCounter
    payCounter++

    const base = emp.base_salary
    const stdDays = 22
    const actDays = Math.random() > 0.8 ? 21 : 22 // Hầu hết đi làm đủ
    
    // Giờ tăng ca
    const otHours = Math.random() > 0.7 ? Math.floor(2 + Math.random() * 10) : 0
    const otPay = Math.round(otHours * (base / stdDays / 8) * 1.5)

    // Phụ cấp/khấu trừ
    const allowance = Math.random() > 0.5 ? Math.floor(500000 + Math.random() * 1000000) : 0
    const deduction = Math.random() > 0.7 ? Math.floor(100000 + Math.random() * 200000) : 0

    // Gross
    const gross = Math.round((base * actDays / stdDays) + otPay + allowance - deduction)
    
    // Bảo hiểm (10.5% cá nhân)
    const insurance = Math.round(gross * 0.105)

    // Thuế TNCN tạm tính
    const taxable = gross - insurance - 11000000 // Giảm trừ gia cảnh 11 triệu
    let pit = 0
    if (taxable > 0) {
      pit = Math.round(taxable * 0.05) // Thuế bậc 1: 5%
    }

    // Net
    const net = gross - insurance - pit

    payrollsToCreate.push({
      payroll_id: `PAY-${String(nextId).padStart(6, '0')}`,
      period_id: periodId,
      version: 1,
      base_salary: base,
      work_days_standard: stdDays,
      work_days_actual: actDays,
      overtime_hours: otHours,
      overtime_pay: otPay,
      allowance,
      deduction,
      gross_pay: gross,
      insurance,
      pit,
      net_pay: net,
      pay_date: '2026-07-05',
      status: 'Đã thanh toán',
      employee_id: emp.employee_id
    })
  }

  if (payrollsToCreate.length > 0) {
    await prisma.payroll.createMany({ data: payrollsToCreate })
    console.log(`Đã tạo ${payrollsToCreate.length} bảng lương Tháng 6/2026 thành công.`)
  }

  console.log('--- HOÀN TẤT SINH DỮ LIỆU ĐỒNG BỘ ---')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
