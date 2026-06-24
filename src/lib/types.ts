// ========================
// CORE TYPES
// ========================

export type Status = 'Active' | 'Inactive'
export type ContractType = 'Full-time' | 'Part-time' | 'Probation' | 'Contract'
export type Gender = 'Nam' | 'Nữ' | 'Khác'
export type AttendanceStatus = 'Đúng giờ' | 'Đi trễ' | 'Về sớm' | 'Vắng mặt' | 'Tăng ca' | 'Nghỉ phép' | 'MISSING_CHECKOUT' | 'LEAVE_APPROVED' | 'ABSENT' | 'LATE' | 'ON_TIME'
export type LeaveStatus = 'Chờ duyệt' | 'Đã duyệt' | 'Từ chối' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type LeaveType = 'Nghỉ phép năm' | 'Nghỉ ốm' | 'Nghỉ không lương' | 'Nghỉ chế độ' | 'Việc riêng'
export type PayrollStatus = 'Chưa thanh toán' | 'Đã thanh toán' | 'Đang xử lý'
export type LogAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'APPROVE' | 'REJECT'
export type AdjType = 'Phụ cấp ăn trưa' | 'Thưởng KPI' | 'Thưởng dự án' | 'Phụ cấp xăng xe' | 'Phụ cấp điện thoại' | 'Khấu trừ đi muộn' | 'Khấu trừ nghỉ không phép' | 'Phạt kỷ luật'

// ========================
// SYSTEM SETTINGS
// ========================
export interface SystemSetting {
  setting_id: string
  setting_key: string
  setting_value: string
  setting_type: 'string' | 'number' | 'boolean' | 'time'
  description: string
  updated_at: string
}

// ========================
// USER (RBAC)
// ========================
export interface User {
  user_id: string
  username: string
  password_hash: string
  role: string
  status: string
  created_at: string
  employee_id?: string
}

// ========================
// DEPARTMENT
// ========================
export interface Department {
  department_id: string
  department_name: string
  cost_center: string
  manager_emp_id: string
  status: Status
  created_at: string
}

// ========================
// POSITION
// ========================
export interface Position {
  position_id: string
  position_name: string
  level: 'Director' | 'Manager' | 'Senior' | 'Staff' | 'Junior' | 'Intern' | string
  salary_band_min: number
  salary_band_max: number
  status: Status
}

// ========================
// EMPLOYEE
// ========================
export interface Employee {
  employee_id: string
  employee_code: string
  full_name: string
  gender: Gender
  dob: string
  phone: string
  email: string
  address: string
  department_id: string
  position_id: string
  join_date: string
  contract_type: ContractType
  base_salary: number // we keep this for UI simplicity, but behind the scenes we use SalaryHistory
  bank_account_no: string
  status: Status
  created_at: string
  // computed
  department_name?: string
  position_name?: string
}

// ========================
// SALARY HISTORY & SHIFT ASSIGNMENT
// ========================
export interface SalaryHistory {
  id: string
  amount: number
  effective_from: string
  effective_to?: string | null
  created_at: string
  employee_id: string
}

export interface ShiftAssignment {
  id: string
  effective_from: string
  effective_to?: string | null
  created_at: string
  employee_id: string
  shift_id: string
}

// ========================
// SHIFT
// ========================
export interface Shift {
  shift_id: string
  shift_name: string
  start_time: string
  end_time: string
  break_min: number
  work_hours: number
  status: Status
}

// ========================
// ATTENDANCE & ALERT
// ========================
export interface Attendance {
  attendance_id: string
  work_date: string
  employee_id: string
  shift_id: string
  check_in: string
  check_out: string
  work_minutes?: number | null
  overtime_minutes?: number | null
  late_minutes?: number | null
  early_leave_minutes?: number | null
  status: AttendanceStatus | string
  note: string
  // computed
  employee_name?: string
  shift_name?: string
}

export interface AttendanceAlert {
  alert_id: string
  severity: string // LOW, MEDIUM, HIGH
  status: string // PENDING, RESOLVED
  created_at: string
  resolved_by?: string | null
  resolved_at?: string | null
  attendance_id: string
}

// ========================
// LEAVE REQUEST
// ========================
export interface LeaveRequest {
  leave_id: string
  employee_id: string
  leave_type: LeaveType | string
  from_date: string
  to_date: string
  days: number
  reason: string
  status: LeaveStatus | string
  approved_by: string
  created_at: string
  // computed
  employee_name?: string
  approver_name?: string
}

// ========================
// ALLOWANCES & DEDUCTIONS
// ========================
export interface Adjustment {
  adj_id: string
  month: string
  employee_id: string
  adj_type: AdjType | string
  amount: number
  description: string
  created_at: string
  // computed
  employee_name?: string
}

// ========================
// PAYROLL & PAYROLL PERIOD
// ========================
export interface PayrollPeriod {
  period_id: string
  month: string
  year: string
  state: string // OPEN, CALCULATED, REVIEW, LOCKED, PAID
  locked_by?: string | null
  locked_at?: string | null
  created_at: string
}

export interface Payroll {
  payroll_id: string
  version: number
  period_id: string
  employee_id: string
  base_salary: number
  work_days_standard: number
  work_days_actual: number
  overtime_hours: number
  overtime_pay: number
  allowance: number
  deduction: number
  gross_pay: number
  insurance: number
  pit: number
  net_pay: number
  pay_date: string
  status: PayrollStatus | string
  // computed
  employee_name?: string
  department_name?: string
  position_name?: string
  month?: string // for backward compat with UI
}

// ========================
// SYSTEM LOG
// ========================
export interface SystemLog {
  log_id: string
  log_time: string
  user: string
  action: LogAction | string
  entity_type: string
  entity_id: string
  description: string
}

// ========================
// ENUM VALUES
// ========================
export interface EnumValue {
  enum_group: string
  enum_value: string
  display_name_vi: string
  color_code: string
  sort_order: number
  is_active: boolean
}

// ========================
// KPI / DASHBOARD
// ========================
export interface KpiItem {
  kpi: string
  value: string | number
  unit: string
  note: string
  trend?: number
  trendType?: 'up' | 'down' | 'neutral'
}

// ========================
// STORE TYPE
// ========================
export interface AppData {
  settings: SystemSetting[]
  departments: Department[]
  positions: Position[]
  employees: Employee[]
  shifts: Shift[]
  attendances: Attendance[]
  leaveRequests: LeaveRequest[]
  adjustments: Adjustment[]
  payrolls: Payroll[]
  logs: SystemLog[]
  enumValues: EnumValue[]
  
  users?: User[]
  salaryHistories?: SalaryHistory[]
  shiftAssignments?: ShiftAssignment[]
  payrollPeriods?: PayrollPeriod[]
  attendanceAlerts?: AttendanceAlert[]
}
