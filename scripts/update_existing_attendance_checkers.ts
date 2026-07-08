import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Bắt đầu cập nhật người chấm công trong CSDL ---')

  const employees = await prisma.employee.findMany()
  const empMap = Object.fromEntries(employees.map(e => [e.employee_id, e.employee_code]))

  const attendances = await prisma.attendance.findMany()
  console.log(`Tìm thấy: ${attendances.length} bản ghi chấm công.`)

  let updatedCount = 0
  for (const att of attendances) {
    const empCode = empMap[att.employee_id]
    if (!empCode) continue

    // Randomize: 90% là nhân viên tự chấm công (hiển thị mã NV), 10% giữ/đổi thành Admin Quản trị
    const rand = Math.random()
    const targetChecker = rand < 0.90 ? empCode : 'Admin Quản trị'

    if (att.checked_by !== targetChecker) {
      await prisma.attendance.update({
        where: { attendance_id: att.attendance_id },
        data: { checked_by: targetChecker }
      })
      updatedCount++
    }
  }

  console.log(`✅ Hoàn tất! Đã cập nhật lại ${updatedCount}/${attendances.length} bản ghi chấm công.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
