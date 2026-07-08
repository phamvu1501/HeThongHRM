import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Bắt đầu phân bổ ca làm việc thực tế cho Tháng 7/2026 ---')

  const shifts = await prisma.shift.findMany()
  console.log('Các ca làm việc trong DB:', shifts.map(s => `${s.shift_id} (${s.shift_name})`))

  if (shifts.length === 0) {
    console.error('Không tìm thấy ca làm việc nào trong database.')
    return
  }

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
    if (!['Đúng giờ', 'Đi trễ', 'Tăng ca', 'Về sớm', 'Đi trễ & Về sớm'].includes(att.status)) {
      continue
    }

    // Phân bổ ca dựa trên ID nhân viên để đảm bảo tính nhất quán (Mỗi nhân viên có ca làm cố định)
    const empNum = parseInt(att.employee_id.replace(/\D/g, '') || '0')
    const lastDigit = empNum % shifts.length

    const targetShift = shifts[lastDigit]
    const targetShiftId = targetShift.shift_id

    // Lấy thời gian làm việc tiêu chuẩn của ca đó
    const work_minutes = (targetShift.work_hours || 8) * 60

    // Xác định check-in & check-out dựa trên giờ ca làm
    const [startH, startM] = targetShift.start_time.split(':').map(Number)
    const [endH, endM] = targetShift.end_time.split(':').map(Number)

    let check_in = targetShift.start_time
    let check_out = targetShift.end_time

    if (att.status === 'Đúng giờ') {
      // Đúng giờ: checkin trước 10 phút
      const checkInMin = startH * 60 + startM - 10
      const cinH = String(Math.floor(checkInMin / 60)).padStart(2, '0')
      const cinM = String(checkInMin % 60).padStart(2, '0')
      check_in = `${cinH}:${cinM}`
    } else if (att.status === 'Đi trễ') {
      // Trễ 25 phút
      const checkInMin = startH * 60 + startM + 25
      const cinH = String(Math.floor(checkInMin / 60)).padStart(2, '0')
      const cinM = String(checkInMin % 60).padStart(2, '0')
      check_in = `${cinH}:${cinM}`
    } else if (att.status === 'Tăng ca') {
      // Checkin đúng giờ, checkout muộn 2 tiếng
      const checkInMin = startH * 60 + startM - 5
      const cinH = String(Math.floor(checkInMin / 60)).padStart(2, '0')
      const cinM = String(checkInMin % 60).padStart(2, '0')
      check_in = `${cinH}:${cinM}`

      const checkOutMin = endH * 60 + endM + 120
      const coutH = String(Math.floor(checkOutMin / 60)).padStart(2, '0')
      const coutM = String(checkOutMin % 60).padStart(2, '0')
      check_out = `${coutH}:${coutM}`
    }

    if (att.shift_id !== targetShiftId || att.check_in !== check_in || att.check_out !== check_out || att.work_minutes !== work_minutes) {
      await prisma.attendance.update({
        where: { attendance_id: att.attendance_id },
        data: {
          shift_id: targetShiftId,
          check_in,
          check_out,
          work_minutes
        }
      })
      updatedCount++
    }
  }

  console.log(`✅ Hoàn tất! Đã phân bổ lại ca làm và cập nhật giờ vào/ra cho ${updatedCount}/${attendances.length} bản ghi tháng 7.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
