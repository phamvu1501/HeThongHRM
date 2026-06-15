import type {
  AppData, SystemSetting, Department, Position, Employee, Shift,
  Attendance, LeaveRequest, Adjustment, Payroll, SystemLog, EnumValue
} from './types'

export const mockSettings: SystemSetting[] = [
  { setting_id: 'S001', setting_key: 'company_name', setting_value: 'HRM Company', setting_type: 'string', description: 'Tên công ty hiển thị trên hệ thống', updated_at: '2025-01-01T08:00:00' },
  { setting_id: 'S002', setting_key: 'start_work_time', setting_value: '08:00', setting_type: 'time', description: 'Giờ bắt đầu làm việc chuẩn', updated_at: '2025-01-01T08:00:00' },
  { setting_id: 'S003', setting_key: 'end_work_time', setting_value: '17:30', setting_type: 'time', description: 'Giờ kết thúc làm việc chuẩn', updated_at: '2025-01-01T08:00:00' },
  { setting_id: 'S004', setting_key: 'late_threshold_min', setting_value: '15', setting_type: 'number', description: 'Số phút trễ được chấp nhận trước khi tính đi muộn', updated_at: '2025-01-01T08:00:00' },
  { setting_id: 'S005', setting_key: 'overtime_rate', setting_value: '1.5', setting_type: 'number', description: 'Hệ số nhân lương tăng ca (1.5x)', updated_at: '2025-01-01T08:00:00' },
  { setting_id: 'S006', setting_key: 'currency', setting_value: 'VND', setting_type: 'string', description: 'Đơn vị tiền tệ', updated_at: '2025-01-01T08:00:00' },
  { setting_id: 'S007', setting_key: 'annual_leave_days', setting_value: '12', setting_type: 'number', description: 'Số ngày phép năm chuẩn cho 1 nhân viên', updated_at: '2025-01-01T08:00:00' },
  { setting_id: 'S008', setting_key: 'insurance_rate_emp', setting_value: '10.5', setting_type: 'number', description: 'Tỷ lệ đóng BHXH+BHYT+BHTN phía nhân viên (%)', updated_at: '2025-01-01T08:00:00' },
]

export const mockDepartments: Department[] = [
  { department_id: 'D001', department_name: 'Hành chính - Nhân sự', cost_center: 'CC-HR', manager_emp_id: 'E001', status: 'Active', created_at: '2020-01-15' },
  { department_id: 'D002', department_name: 'Kỹ thuật - Công nghệ', cost_center: 'CC-IT', manager_emp_id: 'E003', status: 'Active', created_at: '2020-01-15' },
  { department_id: 'D003', department_name: 'Kinh doanh - Sales', cost_center: 'CC-SAL', manager_emp_id: 'E006', status: 'Active', created_at: '2020-01-15' },
  { department_id: 'D004', department_name: 'Marketing', cost_center: 'CC-MKT', manager_emp_id: 'E009', status: 'Active', created_at: '2020-06-01' },
  { department_id: 'D005', department_name: 'Kế toán - Tài chính', cost_center: 'CC-FIN', manager_emp_id: 'E012', status: 'Active', created_at: '2020-01-15' },
  { department_id: 'D006', department_name: 'Vận hành - Logistics', cost_center: 'CC-OPS', manager_emp_id: 'E015', status: 'Inactive', created_at: '2021-03-01' },
]

export const mockPositions: Position[] = [
  { position_id: 'P001', position_name: 'Giám đốc điều hành (CEO)', level: 'Director', salary_band_min: 80000000, salary_band_max: 150000000, status: 'Active' },
  { position_id: 'P002', position_name: 'Trưởng phòng', level: 'Manager', salary_band_min: 30000000, salary_band_max: 60000000, status: 'Active' },
  { position_id: 'P003', position_name: 'Chuyên viên cấp cao', level: 'Senior', salary_band_min: 20000000, salary_band_max: 40000000, status: 'Active' },
  { position_id: 'P004', position_name: 'Chuyên viên', level: 'Staff', salary_band_min: 12000000, salary_band_max: 25000000, status: 'Active' },
  { position_id: 'P005', position_name: 'Nhân viên', level: 'Junior', salary_band_min: 8000000, salary_band_max: 15000000, status: 'Active' },
  { position_id: 'P006', position_name: 'Thực tập sinh', level: 'Intern', salary_band_min: 3000000, salary_band_max: 6000000, status: 'Active' },
  { position_id: 'P007', position_name: 'Kỹ sư phần mềm', level: 'Staff', salary_band_min: 15000000, salary_band_max: 30000000, status: 'Active' },
  { position_id: 'P008', position_name: 'Tech Lead', level: 'Senior', salary_band_min: 35000000, salary_band_max: 65000000, status: 'Active' },
]

export const mockEmployees: Employee[] = [
  { employee_id: 'E001', employee_code: 'NV001', full_name: 'Nguyễn Thị Hương', gender: 'Nữ', dob: '1988-05-12', phone: '0901234567', email: 'huong.nt@hrmpro.vn', address: '123 Nguyễn Huệ, Q1, TP.HCM', department_id: 'D001', position_id: 'P002', join_date: '2020-01-15', contract_type: 'Full-time', base_salary: 35000000, bank_account_no: '0101000123456', status: 'Active', created_at: '2020-01-15' },
  { employee_id: 'E002', employee_code: 'NV002', full_name: 'Trần Văn Minh', gender: 'Nam', dob: '1990-08-22', phone: '0912345678', email: 'minh.tv@hrmpro.vn', address: '456 Lê Lợi, Q3, TP.HCM', department_id: 'D001', position_id: 'P004', join_date: '2021-03-01', contract_type: 'Full-time', base_salary: 18000000, bank_account_no: '0101000234567', status: 'Active', created_at: '2021-03-01' },
  { employee_id: 'E003', employee_code: 'NV003', full_name: 'Lê Anh Tuấn', gender: 'Nam', dob: '1985-11-30', phone: '0923456789', email: 'tuan.la@hrmpro.vn', address: '789 Điện Biên Phủ, Q10, TP.HCM', department_id: 'D002', position_id: 'P008', join_date: '2020-02-01', contract_type: 'Full-time', base_salary: 55000000, bank_account_no: '0101000345678', status: 'Active', created_at: '2020-02-01' },
  { employee_id: 'E004', employee_code: 'NV004', full_name: 'Phan Thị Lan', gender: 'Nữ', dob: '1993-04-15', phone: '0934567890', email: 'lan.pt@hrmpro.vn', address: '321 Võ Thị Sáu, Q3, TP.HCM', department_id: 'D002', position_id: 'P007', join_date: '2022-01-15', contract_type: 'Full-time', base_salary: 22000000, bank_account_no: '0101000456789', status: 'Active', created_at: '2022-01-15' },
  { employee_id: 'E005', employee_code: 'NV005', full_name: 'Võ Quốc Hùng', gender: 'Nam', dob: '1995-07-08', phone: '0945678901', email: 'hung.vq@hrmpro.vn', address: '654 Nam Kỳ Khởi Nghĩa, Q1, TP.HCM', department_id: 'D002', position_id: 'P005', join_date: '2023-06-01', contract_type: 'Probation', base_salary: 12000000, bank_account_no: '0101000567890', status: 'Active', created_at: '2023-06-01' },
  { employee_id: 'E006', employee_code: 'NV006', full_name: 'Hoàng Minh Châu', gender: 'Nam', dob: '1982-02-18', phone: '0956789012', email: 'chau.hm@hrmpro.vn', address: '987 Pasteur, Q3, TP.HCM', department_id: 'D003', position_id: 'P002', join_date: '2020-01-15', contract_type: 'Full-time', base_salary: 45000000, bank_account_no: '0101000678901', status: 'Active', created_at: '2020-01-15' },
  { employee_id: 'E007', employee_code: 'NV007', full_name: 'Đặng Thu Hà', gender: 'Nữ', dob: '1991-09-25', phone: '0967890123', email: 'ha.dt@hrmpro.vn', address: '147 Cách Mạng Tháng 8, Q10, TP.HCM', department_id: 'D003', position_id: 'P003', join_date: '2021-07-01', contract_type: 'Full-time', base_salary: 28000000, bank_account_no: '0101000789012', status: 'Active', created_at: '2021-07-01' },
  { employee_id: 'E008', employee_code: 'NV008', full_name: 'Bùi Thanh Tùng', gender: 'Nam', dob: '1997-12-03', phone: '0978901234', email: 'tung.bt@hrmpro.vn', address: '258 Hai Bà Trưng, Q1, TP.HCM', department_id: 'D003', position_id: 'P005', join_date: '2024-01-08', contract_type: 'Part-time', base_salary: 9000000, bank_account_no: '0101000890123', status: 'Active', created_at: '2024-01-08' },
  { employee_id: 'E009', employee_code: 'NV009', full_name: 'Lý Thị Kim Ngân', gender: 'Nữ', dob: '1989-03-20', phone: '0989012345', email: 'ngan.ltk@hrmpro.vn', address: '369 Trần Hưng Đạo, Q5, TP.HCM', department_id: 'D004', position_id: 'P002', join_date: '2020-08-01', contract_type: 'Full-time', base_salary: 38000000, bank_account_no: '0101000901234', status: 'Active', created_at: '2020-08-01' },
  { employee_id: 'E010', employee_code: 'NV010', full_name: 'Trương Văn Đức', gender: 'Nam', dob: '1994-06-14', phone: '0990123456', email: 'duc.tv@hrmpro.vn', address: '741 Ngô Quyền, Q10, TP.HCM', department_id: 'D004', position_id: 'P004', join_date: '2022-09-01', contract_type: 'Full-time', base_salary: 20000000, bank_account_no: '0101001012345', status: 'Active', created_at: '2022-09-01' },
  { employee_id: 'E011', employee_code: 'NV011', full_name: 'Ngô Mỹ Linh', gender: 'Nữ', dob: '1999-10-28', phone: '0901123456', email: 'linh.nm@hrmpro.vn', address: '852 Lý Thường Kiệt, Q10, TP.HCM', department_id: 'D004', position_id: 'P006', join_date: '2025-01-06', contract_type: 'Probation', base_salary: 5000000, bank_account_no: '0101001123456', status: 'Active', created_at: '2025-01-06' },
  { employee_id: 'E012', employee_code: 'NV012', full_name: 'Phạm Hoàng Long', gender: 'Nam', dob: '1983-01-07', phone: '0912234567', email: 'long.ph@hrmpro.vn', address: '963 Nguyễn Thị Minh Khai, Q3, TP.HCM', department_id: 'D005', position_id: 'P002', join_date: '2020-01-15', contract_type: 'Full-time', base_salary: 42000000, bank_account_no: '0101001234567', status: 'Active', created_at: '2020-01-15' },
  { employee_id: 'E013', employee_code: 'NV013', full_name: 'Đinh Thị Thu', gender: 'Nữ', dob: '1992-11-16', phone: '0923345678', email: 'thu.dt@hrmpro.vn', address: '174 Bà Huyện Thanh Quan, Q3, TP.HCM', department_id: 'D005', position_id: 'P004', join_date: '2021-11-01', contract_type: 'Full-time', base_salary: 22000000, bank_account_no: '0101001345678', status: 'Active', created_at: '2021-11-01' },
  { employee_id: 'E014', employee_code: 'NV014', full_name: 'Cao Văn Thắng', gender: 'Nam', dob: '1996-08-09', phone: '0934456789', email: 'thang.cv@hrmpro.vn', address: '285 Lê Duẩn, Q1, TP.HCM', department_id: 'D005', position_id: 'P005', join_date: '2023-04-01', contract_type: 'Full-time', base_salary: 14000000, bank_account_no: '0101001456789', status: 'Active', created_at: '2023-04-01' },
  { employee_id: 'E015', employee_code: 'NV015', full_name: 'Vũ Thị Hồng', gender: 'Nữ', dob: '1987-04-04', phone: '0945567890', email: 'hong.vt@hrmpro.vn', address: '396 Võ Văn Tần, Q3, TP.HCM', department_id: 'D006', position_id: 'P002', join_date: '2021-03-15', contract_type: 'Full-time', base_salary: 32000000, bank_account_no: '0101001567890', status: 'Inactive', created_at: '2021-03-15' },
]

export const mockShifts: Shift[] = [
  { shift_id: 'SH001', shift_name: 'Ca hành chính', start_time: '08:00', end_time: '17:30', break_min: 60, work_hours: 8.5, status: 'Active' },
  { shift_id: 'SH002', shift_name: 'Ca sáng', start_time: '06:00', end_time: '14:00', break_min: 30, work_hours: 7.5, status: 'Active' },
  { shift_id: 'SH003', shift_name: 'Ca chiều', start_time: '14:00', end_time: '22:00', break_min: 30, work_hours: 7.5, status: 'Active' },
  { shift_id: 'SH004', shift_name: 'Ca đêm', start_time: '22:00', end_time: '06:00', break_min: 60, work_hours: 7, status: 'Active' },
  { shift_id: 'SH005', shift_name: 'Ca linh hoạt', start_time: '09:00', end_time: '18:00', break_min: 60, work_hours: 8, status: 'Active' },
]

export const mockAttendances: Attendance[] = [
  // Jan 2026
  { attendance_id: 'A001', work_date: '2026-01-02', employee_id: 'E001', shift_id: 'SH001', check_in: '07:58', check_out: '17:32', work_hours: 8.5, overtime_hours: 0, status: 'Đúng giờ', note: '' },
  { attendance_id: 'A002', work_date: '2026-01-02', employee_id: 'E002', shift_id: 'SH001', check_in: '08:20', check_out: '17:30', work_hours: 8.17, overtime_hours: 0, status: 'Đi trễ', note: 'Kẹt xe' },
  { attendance_id: 'A003', work_date: '2026-01-02', employee_id: 'E003', shift_id: 'SH001', check_in: '07:55', check_out: '20:00', work_hours: 8.5, overtime_hours: 2.5, status: 'Tăng ca', note: 'Deadline dự án' },
  { attendance_id: 'A004', work_date: '2026-01-02', employee_id: 'E004', shift_id: 'SH001', check_in: '08:00', check_out: '17:30', work_hours: 8.5, overtime_hours: 0, status: 'Đúng giờ', note: '' },
  { attendance_id: 'A005', work_date: '2026-01-02', employee_id: 'E005', shift_id: 'SH001', check_in: '', check_out: '', work_hours: 0, overtime_hours: 0, status: 'Vắng mặt', note: 'Chưa xin phép' },
  { attendance_id: 'A006', work_date: '2026-01-03', employee_id: 'E001', shift_id: 'SH001', check_in: '07:59', check_out: '17:31', work_hours: 8.5, overtime_hours: 0, status: 'Đúng giờ', note: '' },
  { attendance_id: 'A007', work_date: '2026-01-03', employee_id: 'E003', shift_id: 'SH001', check_in: '08:00', check_out: '19:30', work_hours: 8.5, overtime_hours: 2, status: 'Tăng ca', note: '' },
  { attendance_id: 'A008', work_date: '2026-01-03', employee_id: 'E002', shift_id: 'SH001', check_in: '08:05', check_out: '17:30', work_hours: 8.42, overtime_hours: 0, status: 'Đúng giờ', note: '' },
  { attendance_id: 'A009', work_date: '2026-01-06', employee_id: 'E001', shift_id: 'SH001', check_in: '08:00', check_out: '17:30', work_hours: 8.5, overtime_hours: 0, status: 'Đúng giờ', note: '' },
  { attendance_id: 'A010', work_date: '2026-01-06', employee_id: 'E006', shift_id: 'SH001', check_in: '08:02', check_out: '17:00', work_hours: 7.97, overtime_hours: 0, status: 'Về sớm', note: 'Họp ngoài' },
  { attendance_id: 'A011', work_date: '2026-01-07', employee_id: 'E001', shift_id: 'SH001', check_in: '07:55', check_out: '17:30', work_hours: 8.58, overtime_hours: 0, status: 'Đúng giờ', note: '' },
  { attendance_id: 'A012', work_date: '2026-01-07', employee_id: 'E009', shift_id: 'SH001', check_in: '08:00', check_out: '17:30', work_hours: 8.5, overtime_hours: 0, status: 'Đúng giờ', note: '' },
  // Feb 2026
  { attendance_id: 'A013', work_date: '2026-02-02', employee_id: 'E001', shift_id: 'SH001', check_in: '07:58', check_out: '17:30', work_hours: 8.5, overtime_hours: 0, status: 'Đúng giờ', note: '' },
  { attendance_id: 'A014', work_date: '2026-02-02', employee_id: 'E003', shift_id: 'SH001', check_in: '08:00', check_out: '20:30', work_hours: 8.5, overtime_hours: 3, status: 'Tăng ca', note: 'Sprint review' },
  { attendance_id: 'A015', work_date: '2026-02-03', employee_id: 'E002', shift_id: 'SH001', check_in: '09:00', check_out: '17:30', work_hours: 7.5, overtime_hours: 0, status: 'Đi trễ', note: '' },
  { attendance_id: 'A016', work_date: '2026-02-03', employee_id: 'E004', shift_id: 'SH001', check_in: '08:00', check_out: '17:30', work_hours: 8.5, overtime_hours: 0, status: 'Đúng giờ', note: '' },
  { attendance_id: 'A017', work_date: '2026-02-04', employee_id: 'E001', shift_id: 'SH001', check_in: '', check_out: '', work_hours: 0, overtime_hours: 0, status: 'Nghỉ phép', note: 'Nghỉ phép năm đã duyệt' },
  { attendance_id: 'A018', work_date: '2026-02-10', employee_id: 'E006', shift_id: 'SH001', check_in: '08:00', check_out: '17:30', work_hours: 8.5, overtime_hours: 0, status: 'Đúng giờ', note: '' },
  { attendance_id: 'A019', work_date: '2026-02-11', employee_id: 'E007', shift_id: 'SH001', check_in: '08:10', check_out: '17:30', work_hours: 8.33, overtime_hours: 0, status: 'Đi trễ', note: '' },
  { attendance_id: 'A020', work_date: '2026-02-12', employee_id: 'E012', shift_id: 'SH001', check_in: '08:00', check_out: '19:00', work_hours: 8.5, overtime_hours: 1.5, status: 'Tăng ca', note: 'Chuẩn bị báo cáo quý' },
  { attendance_id: 'A021', work_date: '2026-02-24', employee_id: 'E001', shift_id: 'SH001', check_in: '07:50', check_out: '17:30', work_hours: 8.67, overtime_hours: 0, status: 'Đúng giờ', note: '' },
  { attendance_id: 'A022', work_date: '2026-02-25', employee_id: 'E003', shift_id: 'SH001', check_in: '08:00', check_out: '17:30', work_hours: 8.5, overtime_hours: 0, status: 'Đúng giờ', note: '' },
  { attendance_id: 'A023', work_date: '2026-02-26', employee_id: 'E005', shift_id: 'SH001', check_in: '08:30', check_out: '17:30', work_hours: 8, overtime_hours: 0, status: 'Đi trễ', note: '' },
  { attendance_id: 'A024', work_date: '2026-02-27', employee_id: 'E001', shift_id: 'SH001', check_in: '07:55', check_out: '17:32', work_hours: 8.62, overtime_hours: 0, status: 'Đúng giờ', note: '' },
  { attendance_id: 'A025', work_date: '2026-02-28', employee_id: 'E001', shift_id: 'SH001', check_in: '07:58', check_out: '17:30', work_hours: 8.5, overtime_hours: 0, status: 'Đúng giờ', note: '' },
  { attendance_id: 'A026', work_date: '2026-02-28', employee_id: 'E002', shift_id: 'SH001', check_in: '08:02', check_out: '17:30', work_hours: 8.47, overtime_hours: 0, status: 'Đúng giờ', note: '' },
  { attendance_id: 'A027', work_date: '2026-02-28', employee_id: 'E003', shift_id: 'SH001', check_in: '07:55', check_out: '20:00', work_hours: 8.5, overtime_hours: 2.5, status: 'Tăng ca', note: 'Go-live preparation' },
  { attendance_id: 'A028', work_date: '2026-02-28', employee_id: 'E004', shift_id: 'SH001', check_in: '08:00', check_out: '17:30', work_hours: 8.5, overtime_hours: 0, status: 'Đúng giờ', note: '' },
  { attendance_id: 'A029', work_date: '2026-02-28', employee_id: 'E006', shift_id: 'SH001', check_in: '08:00', check_out: '17:30', work_hours: 8.5, overtime_hours: 0, status: 'Đúng giờ', note: '' },
  { attendance_id: 'A030', work_date: '2026-02-28', employee_id: 'E009', shift_id: 'SH001', check_in: '08:15', check_out: '17:30', work_hours: 8.25, overtime_hours: 0, status: 'Đi trễ', note: '' },
]

export const mockLeaveRequests: LeaveRequest[] = [
  { leave_id: 'OFF001', employee_id: 'E001', leave_type: 'Nghỉ phép năm', from_date: '2026-02-04', to_date: '2026-02-05', days: 2, reason: 'Giải quyết việc gia đình', status: 'Đã duyệt', approved_by: 'E006', created_at: '2026-01-30T10:00:00' },
  { leave_id: 'OFF002', employee_id: 'E002', leave_type: 'Nghỉ ốm', from_date: '2026-02-15', to_date: '2026-02-15', days: 1, reason: 'Sốt siêu vi, có giấy bác sỹ', status: 'Đã duyệt', approved_by: 'E001', created_at: '2026-02-14T20:00:00' },
  { leave_id: 'OFF003', employee_id: 'E005', leave_type: 'Nghỉ không lương', from_date: '2026-02-20', to_date: '2026-02-20', days: 1, reason: 'Việc riêng cá nhân', status: 'Từ chối', approved_by: 'E003', created_at: '2026-02-18T09:00:00' },
  { leave_id: 'OFF004', employee_id: 'E004', leave_type: 'Nghỉ chế độ', from_date: '2026-01-20', to_date: '2026-01-20', days: 0.5, reason: 'Khám thai định kỳ', status: 'Đã duyệt', approved_by: 'E003', created_at: '2026-01-18T15:00:00' },
  { leave_id: 'OFF005', employee_id: 'E007', leave_type: 'Nghỉ phép năm', from_date: '2026-03-10', to_date: '2026-03-12', days: 3, reason: 'Du lịch gia đình', status: 'Chờ duyệt', approved_by: '', created_at: '2026-02-25T08:00:00' },
  { leave_id: 'OFF006', employee_id: 'E009', leave_type: 'Việc riêng', from_date: '2026-02-28', to_date: '2026-02-28', days: 1, reason: 'Họp trường học con', status: 'Chờ duyệt', approved_by: '', created_at: '2026-02-27T17:00:00' },
  { leave_id: 'OFF007', employee_id: 'E012', leave_type: 'Nghỉ phép năm', from_date: '2026-03-15', to_date: '2026-03-18', days: 4, reason: 'Nghỉ hè kết hợp hội thảo', status: 'Chờ duyệt', approved_by: '', created_at: '2026-02-28T10:00:00' },
  { leave_id: 'OFF008', employee_id: 'E010', leave_type: 'Nghỉ ốm', from_date: '2026-02-05', to_date: '2026-02-06', days: 2, reason: 'Viêm họng cấp', status: 'Đã duyệt', approved_by: 'E009', created_at: '2026-02-04T19:30:00' },
]

export const mockAdjustments: Adjustment[] = [
  { adj_id: 'ADJ001', month: '2026-01', employee_id: 'E001', adj_type: 'Phụ cấp ăn trưa', amount: 800000, description: 'Phụ cấp ăn trưa tháng 1/2026', created_at: '2026-01-31' },
  { adj_id: 'ADJ002', month: '2026-01', employee_id: 'E001', adj_type: 'Phụ cấp điện thoại', amount: 500000, description: 'Phụ cấp điện thoại tháng 1/2026', created_at: '2026-01-31' },
  { adj_id: 'ADJ003', month: '2026-01', employee_id: 'E003', adj_type: 'Thưởng dự án', amount: 5000000, description: 'Thưởng hoàn thành dự án Alpha đúng hạn', created_at: '2026-01-31' },
  { adj_id: 'ADJ004', month: '2026-01', employee_id: 'E002', adj_type: 'Khấu trừ đi muộn', amount: -300000, description: 'Đi muộn 5 lần trong tháng (60,000 x 5)', created_at: '2026-01-31' },
  { adj_id: 'ADJ005', month: '2026-01', employee_id: 'E006', adj_type: 'Thưởng KPI', amount: 8000000, description: 'Đạt 120% KPI doanh số tháng 1', created_at: '2026-01-31' },
  { adj_id: 'ADJ006', month: '2026-02', employee_id: 'E001', adj_type: 'Phụ cấp ăn trưa', amount: 800000, description: 'Phụ cấp ăn trưa tháng 2/2026', created_at: '2026-02-28' },
  { adj_id: 'ADJ007', month: '2026-02', employee_id: 'E003', adj_type: 'Phụ cấp xăng xe', amount: 1000000, description: 'Phụ cấp đi lại tháng 2/2026', created_at: '2026-02-28' },
  { adj_id: 'ADJ008', month: '2026-02', employee_id: 'E005', adj_type: 'Phạt kỷ luật', amount: -500000, description: 'Vắng mặt không phép 1 ngày', created_at: '2026-02-28' },
  { adj_id: 'ADJ009', month: '2026-02', employee_id: 'E012', adj_type: 'Thưởng KPI', amount: 4000000, description: 'Hoàn thành báo cáo tài chính quý 4 xuất sắc', created_at: '2026-02-28' },
]

export const mockPayrolls: Payroll[] = [
  { payroll_id: 'PY001', month: '2026-01', employee_id: 'E001', base_salary: 35000000, work_days_standard: 23, work_days_actual: 22, overtime_hours: 0, overtime_pay: 0, allowance: 1300000, deduction: 0, gross_pay: 34608695 + 1300000, insurance: 3675000, pit: 2800000, net_pay: 29433695, pay_date: '2026-02-05', status: 'Đã thanh toán' },
  { payroll_id: 'PY002', month: '2026-01', employee_id: 'E002', base_salary: 18000000, work_days_standard: 23, work_days_actual: 22, overtime_hours: 0, overtime_pay: 0, allowance: 0, deduction: 300000, gross_pay: 17217391 - 300000, insurance: 1890000, pit: 0, net_pay: 15027391, pay_date: '2026-02-05', status: 'Đã thanh toán' },
  { payroll_id: 'PY003', month: '2026-01', employee_id: 'E003', base_salary: 55000000, work_days_standard: 23, work_days_actual: 23, overtime_hours: 4.5, overtime_pay: 2898913, allowance: 5000000, deduction: 0, gross_pay: 55000000 + 2898913 + 5000000, insurance: 5775000, pit: 8500000, net_pay: 48623913, pay_date: '2026-02-05', status: 'Đã thanh toán' },
  { payroll_id: 'PY004', month: '2026-01', employee_id: 'E004', base_salary: 22000000, work_days_standard: 23, work_days_actual: 23, overtime_hours: 0, overtime_pay: 0, allowance: 0, deduction: 0, gross_pay: 22000000, insurance: 2310000, pit: 500000, net_pay: 19190000, pay_date: '2026-02-05', status: 'Đã thanh toán' },
  { payroll_id: 'PY005', month: '2026-01', employee_id: 'E006', base_salary: 45000000, work_days_standard: 23, work_days_actual: 23, overtime_hours: 0, overtime_pay: 0, allowance: 8000000, deduction: 0, gross_pay: 53000000, insurance: 4725000, pit: 9200000, net_pay: 39075000, pay_date: '2026-02-05', status: 'Đã thanh toán' },
  { payroll_id: 'PY006', month: '2026-01', employee_id: 'E009', base_salary: 38000000, work_days_standard: 23, work_days_actual: 23, overtime_hours: 0, overtime_pay: 0, allowance: 0, deduction: 0, gross_pay: 38000000, insurance: 3990000, pit: 5000000, net_pay: 29010000, pay_date: '2026-02-05', status: 'Đã thanh toán' },
  { payroll_id: 'PY007', month: '2026-01', employee_id: 'E012', base_salary: 42000000, work_days_standard: 23, work_days_actual: 22, overtime_hours: 1.5, overtime_pay: 561957, allowance: 0, deduction: 0, gross_pay: 41608695 + 561957, insurance: 4410000, pit: 6500000, net_pay: 31260652, pay_date: '2026-02-05', status: 'Đã thanh toán' },
  { payroll_id: 'PY008', month: '2026-02', employee_id: 'E001', base_salary: 35000000, work_days_standard: 20, work_days_actual: 18, overtime_hours: 0, overtime_pay: 0, allowance: 800000, deduction: 0, gross_pay: 31500000 + 800000, insurance: 3675000, pit: 2300000, net_pay: 26325000, pay_date: '2026-03-05', status: 'Chưa thanh toán' },
  { payroll_id: 'PY009', month: '2026-02', employee_id: 'E003', base_salary: 55000000, work_days_standard: 20, work_days_actual: 20, overtime_hours: 5.5, overtime_pay: 3781250, allowance: 1000000, deduction: 0, gross_pay: 59781250, insurance: 5775000, pit: 9200000, net_pay: 44806250, pay_date: '2026-03-05', status: 'Chưa thanh toán' },
  { payroll_id: 'PY010', month: '2026-02', employee_id: 'E012', base_salary: 42000000, work_days_standard: 20, work_days_actual: 20, overtime_hours: 1.5, overtime_pay: 472500, allowance: 4000000, deduction: 0, gross_pay: 46472500, insurance: 4410000, pit: 6800000, net_pay: 35262500, pay_date: '2026-03-05', status: 'Đang xử lý' },
]

export const mockLogs: SystemLog[] = [
  { log_id: 'L001', log_time: '2026-02-28T17:45:00', user: 'Admin', action: 'UPDATE', entity_type: 'Bảng lương', entity_id: 'PY009', description: 'Cập nhật tiền tăng ca tháng 02/2026 cho NV003' },
  { log_id: 'L002', log_time: '2026-02-28T15:20:00', user: 'Manager_HR', action: 'APPROVE', entity_type: 'Đơn xin nghỉ', entity_id: 'OFF001', description: 'Phê duyệt đơn xin nghỉ phép OFF001 của NV001' },
  { log_id: 'L003', log_time: '2026-02-28T10:30:00', user: 'System', action: 'CREATE', entity_type: 'Chấm công', entity_id: 'A025', description: 'Hệ thống tự động tạo bản ghi chấm công ngày 28/02/2026' },
  { log_id: 'L004', log_time: '2026-02-27T16:00:00', user: 'Manager_HR', action: 'REJECT', entity_type: 'Đơn xin nghỉ', entity_id: 'OFF003', description: 'Từ chối đơn xin nghỉ của NV005 - Lực lượng mỏng' },
  { log_id: 'L005', log_time: '2026-02-27T09:15:00', user: 'Admin', action: 'CREATE', entity_type: 'Nhân viên', entity_id: 'E011', description: 'Thêm mới nhân viên thực tập NV011 - Ngô Mỹ Linh' },
  { log_id: 'L006', log_time: '2026-02-26T14:30:00', user: 'Admin', action: 'UPDATE', entity_type: 'Nhân viên', entity_id: 'E015', description: 'Cập nhật trạng thái NV015 thành Inactive (đã nghỉ việc)' },
  { log_id: 'L007', log_time: '2026-02-25T08:00:00', user: 'System', action: 'LOGIN', entity_type: 'Auth', entity_id: 'Admin', description: 'Đăng nhập hệ thống thành công' },
  { log_id: 'L008', log_time: '2026-02-24T11:00:00', user: 'Admin', action: 'UPDATE', entity_type: 'Phụ cấp', entity_id: 'ADJ009', description: 'Thêm thưởng KPI tháng 02 cho kế toán trưởng' },
  { log_id: 'L009', log_time: '2026-02-20T17:30:00', user: 'System', action: 'CREATE', entity_type: 'Bảng lương', entity_id: 'PY008', description: 'Tự động tạo bảng lương tháng 02/2026 cho tất cả nhân viên' },
  { log_id: 'L010', log_time: '2026-02-05T10:00:00', user: 'Admin', action: 'UPDATE', entity_type: 'Bảng lương', entity_id: 'PY001', description: 'Cập nhật trạng thái bảng lương tháng 01 thành Đã thanh toán' },
]

export const mockEnumValues: EnumValue[] = [
  // TRANG_THAI_CHAM_CONG
  { enum_group: 'TRANG_THAI_CHAM_CONG', enum_value: 'DUNG_GIO', display_name_vi: 'Đúng giờ', color_code: '#10b981', sort_order: 1, is_active: true },
  { enum_group: 'TRANG_THAI_CHAM_CONG', enum_value: 'DI_TRE', display_name_vi: 'Đi trễ', color_code: '#f59e0b', sort_order: 2, is_active: true },
  { enum_group: 'TRANG_THAI_CHAM_CONG', enum_value: 'VE_SOM', display_name_vi: 'Về sớm', color_code: '#f97316', sort_order: 3, is_active: true },
  { enum_group: 'TRANG_THAI_CHAM_CONG', enum_value: 'VANG_MAT', display_name_vi: 'Vắng mặt', color_code: '#ef4444', sort_order: 4, is_active: true },
  { enum_group: 'TRANG_THAI_CHAM_CONG', enum_value: 'TANG_CA', display_name_vi: 'Tăng ca', color_code: '#bde619', sort_order: 5, is_active: true },
  // LOAI_HOP_DONG
  { enum_group: 'LOAI_HOP_DONG', enum_value: 'FULL_TIME', display_name_vi: 'Toàn thời gian', color_code: '#3b82f6', sort_order: 1, is_active: true },
  { enum_group: 'LOAI_HOP_DONG', enum_value: 'PART_TIME', display_name_vi: 'Bán thời gian', color_code: '#8b5cf6', sort_order: 2, is_active: true },
  { enum_group: 'LOAI_HOP_DONG', enum_value: 'PROBATION', display_name_vi: 'Thử việc', color_code: '#f59e0b', sort_order: 3, is_active: true },
  // TRANG_THAI_DON_TU
  { enum_group: 'TRANG_THAI_DON_TU', enum_value: 'CHO_DUYET', display_name_vi: 'Chờ duyệt', color_code: '#f59e0b', sort_order: 1, is_active: true },
  { enum_group: 'TRANG_THAI_DON_TU', enum_value: 'DA_DUYET', display_name_vi: 'Đã duyệt', color_code: '#10b981', sort_order: 2, is_active: true },
  { enum_group: 'TRANG_THAI_DON_TU', enum_value: 'TU_CHOI', display_name_vi: 'Từ chối', color_code: '#ef4444', sort_order: 3, is_active: true },
]

// Build full AppData
export function buildAppData(): AppData {
  const empMap = Object.fromEntries(mockEmployees.map(e => [e.employee_id, e]))
  const deptMap = Object.fromEntries(mockDepartments.map(d => [d.department_id, d]))
  const posMap = Object.fromEntries(mockPositions.map(p => [p.position_id, p]))
  const shiftMap = Object.fromEntries(mockShifts.map(s => [s.shift_id, s]))

  const employees = mockEmployees.map(e => ({
    ...e,
    department_name: deptMap[e.department_id]?.department_name,
    position_name: posMap[e.position_id]?.position_name,
  }))

  const attendances = mockAttendances.map(a => ({
    ...a,
    employee_name: empMap[a.employee_id]?.full_name,
    shift_name: shiftMap[a.shift_id]?.shift_name,
  }))

  const leaveRequests = mockLeaveRequests.map(l => ({
    ...l,
    employee_name: empMap[l.employee_id]?.full_name,
    approver_name: l.approved_by ? empMap[l.approved_by]?.full_name : '',
  }))

  const adjustments = mockAdjustments.map(a => ({
    ...a,
    employee_name: empMap[a.employee_id]?.full_name,
  }))

  const payrolls = mockPayrolls.map(p => ({
    ...p,
    employee_name: empMap[p.employee_id]?.full_name,
    department_name: deptMap[empMap[p.employee_id]?.department_id]?.department_name,
    position_name: posMap[empMap[p.employee_id]?.position_id]?.position_name,
  }))

  return {
    settings: mockSettings,
    departments: mockDepartments,
    positions: mockPositions,
    employees,
    shifts: mockShifts,
    attendances,
    leaveRequests,
    adjustments,
    payrolls,
    logs: mockLogs,
    enumValues: mockEnumValues,
  }
}
