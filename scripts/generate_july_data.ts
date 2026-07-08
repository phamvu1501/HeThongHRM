import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Bắt đầu sinh dữ liệu tháng 7/2026 ---')

  // Lấy danh sách các phòng ban và chức vụ thực tế trong database
  const depts = await prisma.department.findMany()
  const positions = await prisma.position.findMany()
  const shifts = await prisma.shift.findMany()

  if (depts.length === 0 || positions.length === 0 || shifts.length === 0) {
    console.error('Không tìm thấy phòng ban, chức vụ hoặc ca làm việc trong cơ sở dữ liệu. Hãy chạy seed trước.')
    return
  }

  console.log(`Tìm thấy: ${depts.length} phòng ban, ${positions.length} chức vụ, ${shifts.length} ca làm việc.`)

  // Lấy các ID hợp lệ
  const hrDept = depts.find(d => d.department_name.includes('Nhân sự') || d.department_name.includes('Hành chính')) || depts[0]
  const itDept = depts.find(d => d.department_name.toLowerCase().includes('kỹ thuật') || d.department_name.toLowerCase().includes('it') || d.department_name.toLowerCase().includes('công nghệ')) || depts[0]
  const salesDept = depts.find(d => d.department_name.toLowerCase().includes('sales') || d.department_name.toLowerCase().includes('kinh doanh')) || depts[0]

  const engineerPos = positions.find(p => p.position_name.toLowerCase().includes('kỹ sư') || p.position_name.toLowerCase().includes('software')) || positions[0]
  const staffPos = positions.find(p => p.position_name.toLowerCase().includes('nhân viên') || p.position_name.toLowerCase().includes('staff') || p.position_name.toLowerCase().includes('chuyên viên')) || positions[0]
  const specialistPos = positions.find(p => p.position_name.toLowerCase().includes('chuyên viên') || p.position_name.toLowerCase().includes('senior') || p.position_name.toLowerCase().includes('staff')) || positions[0]

  // 1. Thêm nhân viên mới gia nhập trong tháng 7/2026
  const newEmployeesData = [
    {
      employee_id: 'E016',
      employee_code: 'NV016',
      full_name: 'Phạm Minh Hoàng',
      gender: 'Nam',
      dob: '1996-10-15',
      phone: '0971112223',
      email: 'hoang.pm@hrmpro.vn',
      address: '78 Lũy Bán Bích, Tân Phú, TP.HCM',
      department_id: itDept.department_id,
      position_id: engineerPos.position_id,
      join_date: '2026-07-01',
      contract_type: 'Full-time',
      base_salary: 24000000,
      bank_account_no: '0101001678901',
      status: 'Active',
      created_at: '2026-07-01'
    },
    {
      employee_id: 'E017',
      employee_code: 'NV017',
      full_name: 'Lê Hoàng Yến',
      gender: 'Nữ',
      dob: '1998-03-24',
      phone: '0982223334',
      email: 'yen.lh@hrmpro.vn',
      address: '45 Nguyễn Trãi, Q5, TP.HCM',
      department_id: hrDept.department_id,
      position_id: staffPos.position_id,
      join_date: '2026-07-01',
      contract_type: 'Probation',
      base_salary: 11000000,
      bank_account_no: '0101001789012',
      status: 'Active',
      created_at: '2026-07-01'
    },
    {
      employee_id: 'E018',
      employee_code: 'NV018',
      full_name: 'Nguyễn Văn Hùng',
      gender: 'Nam',
      dob: '1994-12-05',
      phone: '0933334445',
      email: 'hung.nv@hrmpro.vn',
      address: '102 Quang Trung, Gò Vấp, TP.HCM',
      department_id: salesDept.department_id,
      position_id: specialistPos.position_id,
      join_date: '2026-07-02',
      contract_type: 'Full-time',
      base_salary: 16000000,
      bank_account_no: '0101001890123',
      status: 'Active',
      created_at: '2026-07-02'
    }
  ]

  for (const emp of newEmployeesData) {
    const exists = await prisma.employee.findUnique({
      where: { employee_id: emp.employee_id }
    })
    if (!exists) {
      console.log(`Đang tạo nhân viên: ${emp.full_name} (${emp.employee_code})`)
      await prisma.employee.create({ data: emp })

      // Tạo User
      await prisma.user.create({
        data: {
          username: emp.employee_code.toLowerCase(),
          password_hash: '123123',
          role: 'EMPLOYEE',
          status: 'Active',
          created_at: new Date().toISOString(),
          employee_id: emp.employee_id
        }
      })

      // Tạo SalaryHistory
      await prisma.salaryHistory.create({
        data: {
          amount: emp.base_salary,
          effective_from: emp.join_date,
          created_at: new Date().toISOString(),
          employee_id: emp.employee_id
        }
      })

      // Tạo ShiftAssignment
      await prisma.shiftAssignment.create({
        data: {
          effective_from: emp.join_date,
          created_at: new Date().toISOString(),
          employee_id: emp.employee_id,
          shift_id: shifts[0].shift_id
        }
      })
    }
  }

  // 2. Lấy tất cả nhân viên đang hoạt động
  const activeEmployees = await prisma.employee.findMany({
    where: { status: 'Active' }
  })

  // Danh sách các ngày từ 2026-07-01 đến 2026-07-07
  const julyDays = [
    '2026-07-01',
    '2026-07-02',
    '2026-07-03',
    '2026-07-04', // Thứ Bảy
    '2026-07-06', // Thứ Hai
    '2026-07-07'  // Thứ Ba
  ]

  console.log(`Đang sinh dữ liệu chấm công cho ${activeEmployees.length} nhân viên trong ${julyDays.length} ngày...`)

  let count = 0
  for (const date of julyDays) {
    const isWeekend = new Date(date).getDay() === 0 // Chủ Nhật thì bỏ qua
    if (isWeekend) continue

    for (const emp of activeEmployees) {
      if (date < emp.join_date) continue

      // Kiểm tra xem đã có bản ghi chấm công chưa
      const exists = await prisma.attendance.findFirst({
        where: {
          employee_id: emp.employee_id,
          work_date: date
        }
      })

      if (exists) continue

      const shift = shifts[0]
      if (!shift) continue

      const rand = Math.random()
      let check_in = ''
      let check_out = ''
      let status = 'Đúng giờ'
      let note = ''
      let work_minutes = 0
      let overtime_minutes = 0
      let late_minutes = 0
      let early_leave_minutes = 0
      let checked_by = 'Admin Quản trị'

      if (rand < 0.70) {
        check_in = '07:50'
        check_out = '17:30'
        status = 'Đúng giờ'
        work_minutes = 480
        checked_by = Math.random() > 0.5 ? emp.full_name : 'Admin Quản trị'
      } else if (rand < 0.80) {
        check_in = '08:25'
        check_out = '17:30'
        status = 'Đi trễ'
        work_minutes = 480
        late_minutes = 25
        checked_by = emp.full_name
        note = 'Đi làm muộn do kẹt xe'
      } else if (rand < 0.90) {
        check_in = '07:55'
        check_out = '19:30'
        status = 'Tăng ca'
        work_minutes = 480
        overtime_minutes = 120
        checked_by = 'Admin Quản trị'
        note = 'Hoàn thành công việc tồn đọng'
      } else if (rand < 0.95) {
        status = 'Vắng mặt'
        work_minutes = 0
        note = 'Nghỉ không phép'
      } else {
        status = 'Nghỉ phép'
        work_minutes = 0
        note = 'Nghỉ phép năm đã được duyệt'
      }

      const attId = `ATT_JUL_${emp.employee_id.replace(/\D/g, '')}_${date.replace(/-/g, '')}`

      await prisma.attendance.create({
        data: {
          attendance_id: attId,
          work_date: date,
          check_in,
          check_out,
          work_minutes,
          overtime_minutes,
          late_minutes,
          early_leave_minutes,
          status,
          note,
          checked_by,
          employee_id: emp.employee_id,
          shift_id: shift.shift_id
        }
      })
      count++
    }
  }

  console.log(`✅ Hoàn tất! Đã tạo thêm ${count} bản ghi chấm công trong tháng 7/2026.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
