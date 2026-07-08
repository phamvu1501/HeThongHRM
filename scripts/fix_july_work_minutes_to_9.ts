import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Bắt đầu sửa đổi số giờ làm việc thành 9.0h cho các bản ghi Tháng 7/2026 ---')

  const attendances = await prisma.attendance.findMany({
    where: {
      work_date: {
        startsWith: '2026-07'
      }
    }
  })

  console.log(`Tìm thấy: ${attendances.length} bản ghi chấm công tháng 7.`)

  let updatedCount = 0
  for (const att of attendances) {
    let targetWorkMinutes = 0
    if (['Đúng giờ', 'Đi trễ', 'Tăng ca', 'Về sớm', 'Đi trễ & Về sớm'].includes(att.status)) {
      targetWorkMinutes = 540 // 9 giờ làm việc tiêu chuẩn (từ 8h30 đến 17h30)
    }

    if (att.work_minutes !== targetWorkMinutes) {
      await prisma.attendance.update({
        where: { attendance_id: att.attendance_id },
        data: { work_minutes: targetWorkMinutes }
      })
      updatedCount++
    }
  }

  console.log(`✅ Hoàn tất! Đã cập nhật lại số giờ làm thành 9.0h cho ${updatedCount}/${attendances.length} bản ghi tháng 7.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
