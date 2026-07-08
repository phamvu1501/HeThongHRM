import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

const ho = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Quách', 'Lương', 'Đoàn', 'Trịnh']
const demNam = ['Văn', 'Đức', 'Hữu', 'Quốc', 'Minh', 'Anh', 'Thanh', 'Tuấn', 'Hải', 'Xuân', 'Kim', 'Mạnh', 'Khánh', 'Duy']
const demNu = ['Thị', 'Như', 'Ngọc', 'Hồng', 'Mai', 'Thanh', 'Phương', 'Khánh', 'Lan', 'Kim', 'Trúc', 'Quỳnh', 'Yến']
const tenNam = ['Anh', 'Bình', 'Cường', 'Dương', 'Đạt', 'Giang', 'Hùng', 'Huy', 'Khánh', 'Minh', 'Nam', 'Phong', 'Quân', 'Sơn', 'Tùng', 'Tuấn', 'Lâm', 'Khoa', 'Thịnh', 'Trung', 'Bách']
const tenNu = ['Anh', 'Ngọc', 'Linh', 'Minh', 'Vy', 'Yến', 'Trang', 'Hà', 'Lan', 'Huệ', 'Trúc', 'Thảo', 'Quỳnh', 'Nhi', 'Hương', 'Huyền', 'Mai', 'Dung', 'Liên', 'Trinh']

const streets = [
  'Đường Cách Mạng Tháng 8', 'Đường Lê Lợi', 'Đường Nguyễn Huệ', 'Đường Nam Kỳ Khởi Nghĩa', 'Đường Hai Bà Trưng',
  'Đường Điện Biên Phủ', 'Đường Võ Thị Sáu', 'Đường Lê Duẩn', 'Đường Nguyễn Thị Minh Khai', 'Đường Ba Tháng Hai',
  'Đường Nguyễn Văn Trỗi', 'Đường Cộng Hòa', 'Đường Hoàng Văn Thụ', 'Đường Trường Chinh', 'Đường Phan Đăng Lưu',
  'Đường Trần Hưng Đạo', 'Đường Lê Hồng Phong', 'Đường Nguyễn Trãi', 'Đường Nguyễn Chí Thanh', 'Đường Kim Mã'
]
const districts = ['Q1', 'Q3', 'Q5', 'Q10', 'Tân Bình', 'Tân Phú', 'Bình Thạnh', 'Gò Vấp', 'Phú Nhuận', 'Thủ Đức']
const city = 'TP.HCM'

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateVietnameseName(): { name: string; gender: string } {
  const gender = Math.random() > 0.5 ? 'Nam' : 'Nữ'
  const h = getRandomItem(ho)
  const d = gender === 'Nam' ? getRandomItem(demNam) : getRandomItem(demNu)
  const t = gender === 'Nam' ? getRandomItem(tenNam) : getRandomItem(tenNu)
  return { name: `${h} ${d} ${t}`, gender }
}

function generateRandomDOB(): string {
  // Born between 1980 and 2004
  const start = new Date(1980, 0, 1).getTime()
  const end = new Date(2004, 11, 31).getTime()
  const date = new Date(start + Math.random() * (end - start))
  return date.toISOString().slice(0, 10)
}

function generateRandomPhone(): string {
  const prefixes = ['090', '091', '092', '093', '094', '096', '097', '098', '032', '033', '034', '035', '036', '037', '038', '039', '070', '076', '077', '078', '079']
  const pfx = getRandomItem(prefixes)
  const suffix = Math.floor(1000000 + Math.random() * 9000000).toString().slice(0, 7)
  return pfx + suffix
}

function generateRandomBankAccount(): string {
  const banks = ['010100', '190200', '101200', '007100']
  const pfx = getRandomItem(banks)
  const suffix = Math.floor(1000000 + Math.random() * 9000000).toString().slice(0, 7)
  return pfx + suffix
}

function generateRandomAddress(): string {
  const num = Math.floor(1 + Math.random() * 500)
  return `${num} ${getRandomItem(streets)}, ${getRandomItem(districts)}, ${city}`
}

async function main() {
  console.log('--- Bắt đầu sinh 200 nhân viên mới ---')

  const depts = await prisma.department.findMany()
  const positions = await prisma.position.findMany()

  if (depts.length === 0 || positions.length === 0) {
    console.error('Không tìm thấy phòng ban hoặc chức vụ trong database. Hãy chạy seed trước.')
    return
  }

  // Lấy mã/ID cao nhất hiện tại
  const employees = await prisma.employee.findMany({
    select: { employee_id: true, employee_code: true }
  })

  let maxIdNum = 0
  let maxCodeNum = 0

  for (const emp of employees) {
    const idMatch = emp.employee_id.match(/\d+/)
    if (idMatch) {
      const num = parseInt(idMatch[0])
      if (num > maxIdNum) maxIdNum = num
    }

    const codeMatch = emp.employee_code.match(/\d+/)
    if (codeMatch) {
      const num = parseInt(codeMatch[0])
      if (num > maxCodeNum) maxCodeNum = num
    }
  }

  console.log(`ID lớn nhất hiện tại: EMP-${String(maxIdNum).padStart(6, '0')}`)
  console.log(`Mã lớn nhất hiện tại: NV-${String(maxCodeNum).padStart(4, '0')}`)

  const contractTypes = ['Full-time', 'Part-time', 'Probation', 'Contract']
  const contractWeights = [0.7, 0.1, 0.15, 0.05]

  function getWeightedContractType(): string {
    const r = Math.random()
    let sum = 0
    for (let i = 0; i < contractTypes.length; i++) {
      sum += contractWeights[i]
      if (r <= sum) return contractTypes[i]
    }
    return 'Full-time'
  }

  const batchSize = 200
  const createdEmployees = []
  const createdUsers = []

  const dateNow = new Date().toISOString()
  const dateStr = dateNow.slice(0, 10)

  for (let i = 1; i <= batchSize; i++) {
    const nextIdNum = maxIdNum + i
    const nextCodeNum = maxCodeNum + i

    const empId = `EMP-${String(nextIdNum).padStart(6, '0')}`
    const empCode = `NV-${String(nextCodeNum).padStart(4, '0')}`

    const { name, gender } = generateVietnameseName()
    const dept = getRandomItem(depts)
    const pos = getRandomItem(positions)

    // Base salary based on position level
    let baseSalary = 12000000
    const level = pos.level.toLowerCase()
    if (level.includes('intern') || level.includes('thực tập')) {
      baseSalary = Math.floor(4000000 + Math.random() * 3000000)
    } else if (level.includes('staff') || level.includes('nhân viên') || level.includes('chuyên viên')) {
      baseSalary = Math.floor(8000000 + Math.random() * 8000000)
    } else if (level.includes('leader') || level.includes('trưởng nhóm') || level.includes('senior')) {
      baseSalary = Math.floor(18000000 + Math.random() * 12000000)
    } else if (level.includes('manager') || level.includes('trưởng phòng') || level.includes('director')) {
      baseSalary = Math.floor(30000000 + Math.random() * 20000000)
    }

    // Email based on name
    const nameWithoutAccent = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
    const nameParts = nameWithoutAccent.split(' ')
    const emailPrefix = `${nameParts[nameParts.length - 1]}.${nameParts[0]}${nameParts.slice(1, nameParts.length - 1).map(p => p[0]).join('')}`
    const email = `${emailPrefix}_${nextCodeNum}@hrmpro.vn`

    // Random join date in the past 1-2 years
    const joinDaysAgo = Math.floor(10 + Math.random() * 700)
    const joinDateObj = new Date()
    joinDateObj.setDate(joinDateObj.getDate() - joinDaysAgo)
    const joinDate = joinDateObj.toISOString().slice(0, 10)

    const empData = {
      employee_id: empId,
      employee_code: empCode,
      full_name: name,
      gender: gender,
      dob: generateRandomDOB(),
      phone: generateRandomPhone(),
      email: email,
      address: generateRandomAddress(),
      join_date: joinDate,
      contract_type: getWeightedContractType(),
      base_salary: baseSalary,
      bank_account_no: generateRandomBankAccount(),
      status: 'Active',
      created_at: dateNow,
      department_id: dept.department_id,
      position_id: pos.position_id
    }

    createdEmployees.push(empData)

    const userData = {
      username: empCode.toLowerCase(),
      password_hash: '123123',
      role: 'EMPLOYEE',
      status: 'Active',
      created_at: dateNow,
      employee_id: empId
    }

    createdUsers.push(userData)
  }

  console.log(`Đang lưu ${batchSize} nhân viên và tài khoản tương ứng vào Database...`)

  // Dùng transaction để thêm hàng loạt bằng createMany để tối ưu tốc độ
  await prisma.$transaction([
    prisma.employee.createMany({ data: createdEmployees }),
    prisma.user.createMany({ data: createdUsers })
  ])

  console.log('--- Hoàn tất! Đã thêm thành công 200 nhân viên và tài khoản. ---')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
