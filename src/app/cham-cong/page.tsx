'use client'
import { useState, useMemo, useEffect } from 'react'
import { fetchData, saveAttendances, logActivity } from '@/lib/store'
import { showToast } from '@/components/Toast'
import { exportAttendances, exportMonthlySummary } from '@/lib/excel'
import { formatDate, getAttendanceStatusColor } from '@/lib/utils'
import { getAuth, AuthUser } from '@/lib/auth'
import { TopBar } from '@/components/TopBar'
import { Modal } from '@/components/Modal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Attendance, AttendanceStatus, Employee, Shift } from '@/lib/types'

const STATUS_LIST: AttendanceStatus[] = ['Đúng giờ', 'Đi trễ', 'Về sớm', 'Đi trễ & Về sớm', 'Thiếu check-out', 'Thiếu check-in', 'Tăng ca', 'Vắng mặt', 'Nghỉ phép']
const STATUS_DOT: Record<string, string> = {
  'Đúng giờ': '#10b981', 'Đi trễ': '#f59e0b', 'Về sớm': '#f97316',
  'Đi trễ & Về sớm': '#b45309', 'Thiếu check-out': '#6b7280', 'Thiếu check-in': '#78716c',
  'Tăng ca': '#84cc16', 'Vắng mặt': '#ef4444', 'Nghỉ phép': '#3b82f6',
}

function genId(prefix: string, list: { attendance_id: string }[]) {
  const nums = list.map(a => parseInt(a.attendance_id.replace(/\D/g, '') || '0'))
  return `ATT-${String(Math.max(0, ...nums) + 1).padStart(6, '0')}`
}

function parseTimeToMinutes(timeStr: string | null | undefined): number {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function calculateAttendanceMinutes(checkIn: string, checkOut: string, shift: Shift) {
  if (!checkIn || !checkOut || !shift) return { work_minutes: 0, overtime_minutes: 0 }

  const inMin = parseTimeToMinutes(checkIn)
  const outMin = parseTimeToMinutes(checkOut)
  if (outMin <= inMin) return { work_minutes: 0, overtime_minutes: 0 }

  const startMin = parseTimeToMinutes(shift.start_time)
  const endMin = parseTimeToMinutes(shift.end_time)

  const actualStart = Math.max(startMin, inMin)
  const actualEnd = Math.min(endMin, outMin)

  let work_minutes = 0
  if (actualEnd > actualStart) {
    work_minutes = actualEnd - actualStart
    if (work_minutes > (shift.break_min || 0)) {
      work_minutes -= (shift.break_min || 0)
    }
  }

  const ot_raw = Math.max(0, outMin - endMin)
  const overtime_minutes = ot_raw > 60 ? ot_raw : 0

  return { work_minutes, overtime_minutes }
}

function determineStatus(checkIn: string, checkOut: string, shift: Shift): AttendanceStatus {
  if (!checkIn || !checkOut || !shift) return 'Vắng mặt'

  const inMin = parseTimeToMinutes(checkIn)
  const outMin = parseTimeToMinutes(checkOut)
  if (outMin <= inMin) return 'Vắng mặt'

  const startMin = parseTimeToMinutes(shift.start_time)
  const endMin = parseTimeToMinutes(shift.end_time)

  const isLate = inMin > startMin + 15 // late threshold 15 mins
  const isEarly = outMin < endMin

  // Overtime if they work more than 60 minutes after shift ends
  const isOvertime = (outMin - endMin) > 60

  if (isOvertime) return 'Tăng ca'
  if (isLate && isEarly) return 'Đi trễ & Về sớm'
  if (isLate) return 'Đi trễ'
  if (isEarly) return 'Về sớm'
  return 'Đúng giờ'
}

function formatMinutesFriendly(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 giờ'
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hrs} giờ`
  return `${hrs} giờ ${mins} phút`
}

function emptyForm(employees: Employee[], shifts: Shift[]) {
  const s = shifts[0]
  return {
    attendance_id: '',
    work_date: new Date().toISOString().slice(0, 10),
    employee_id: employees[0]?.employee_id ?? '',
    shift_id: s?.shift_id ?? '',
    check_in: s?.start_time ?? '08:00',
    check_out: s?.end_time ?? '17:30',
    work_minutes: (s?.work_hours || 8) * 60,
    overtime_minutes: 0,
    late_minutes: 0,
    early_leave_minutes: 0,
    status: 'Đúng giờ' as AttendanceStatus,
    note: '',
    employee_name: '',
    shift_name: '',
    checked_by: '',
  }
}

export default function ChamCongPage() {
  const [records, setRecords] = useState<Attendance[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [auth, setAuth] = useState<AuthUser | null>(null)

  const [empFilter, setEmpFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('2026-02')

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Attendance | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Attendance | null>(null)
  const [form, setForm] = useState(() => emptyForm([], []))
  const [viewTab, setViewTab] = useState<'list' | 'summary'>('list')

  // ── Load data from Database ──
  useEffect(() => {
    setLoading(true)
    const authData = getAuth()
    setAuth(authData)

    fetchData().then(data => {
      let filteredAttendances = data.attendances
      let activeEmps = data.employees.filter(e => e.status === 'Active')

      if (authData?.role === 'EMPLOYEE' && authData.empId) {
        filteredAttendances = data.attendances.filter(a => a.employee_id === authData.empId)
        activeEmps = activeEmps.filter(e => e.employee_id === authData.empId)
      }

      setRecords(filteredAttendances)
      setEmployees(activeEmps)
      setShifts(data.shifts.filter(s => s.status === 'Active'))
      // Set month filter to latest month in data
      const months = [...new Set(data.attendances.map(a => a.work_date.slice(0, 7)))].sort()
      if (months.length > 0) setMonthFilter(months[months.length - 1])
      setLoading(false)
    }).catch(err => {
      setError(err.message)
      setLoading(false)
    })
  }, [])

  // ── Auto Calculate Work, Overtime Minutes and Status ──
  useEffect(() => {
    const sh = shifts.find(s => s.shift_id === form.shift_id)
    if (sh && form.check_in && form.check_out) {
      const { work_minutes, overtime_minutes } = calculateAttendanceMinutes(form.check_in, form.check_out, sh)
      const targetStatus = determineStatus(form.check_in, form.check_out, sh)
      const isWorkStatus = ['Đúng giờ', 'Đi trễ', 'Về sớm', 'Đi trễ & Về sớm', 'Tăng ca'].includes(form.status)
      const newStatus = isWorkStatus ? targetStatus : form.status

      if (work_minutes !== form.work_minutes || overtime_minutes !== form.overtime_minutes || newStatus !== form.status) {
        setForm(p => ({
          ...p,
          work_minutes,
          overtime_minutes,
          status: newStatus
        }))
      }
    }
  }, [form.check_in, form.check_out, form.shift_id, shifts, form.work_minutes, form.overtime_minutes, form.status])

  const currentUserName = useMemo(() => {
    if (!auth) return ''
    if (auth.role === 'ADMIN') return 'Admin Quản trị'
    if (auth.role === 'EMPLOYEE' && auth.empId) {
      const currentEmp = employees.find(e => e.employee_id === auth.empId)
      return currentEmp ? currentEmp.employee_code : 'Nhân viên'
    }
    return ''
  }, [auth, employees])

  const filtered = useMemo(() => records.filter(a => {
    const matchEmp = empFilter === 'all' || a.employee_id === empFilter
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    const matchMonth = a.work_date.startsWith(monthFilter)
    return matchEmp && matchStatus && matchMonth
  }).sort((a, b) => {
    const aCheckedByMe = (a.checked_by || 'Admin Quản trị') === currentUserName
    const bCheckedByMe = (b.checked_by || 'Admin Quản trị') === currentUserName
    if (aCheckedByMe && !bCheckedByMe) return -1
    if (!aCheckedByMe && bCheckedByMe) return 1
    return b.work_date.localeCompare(a.work_date)
  }), [records, empFilter, statusFilter, monthFilter, currentUserName])

  const onTime = filtered.filter(a => a.status === 'Đúng giờ').length
  const late = filtered.filter(a => a.status === 'Đi trễ').length
  const overtime = filtered.filter(a => a.status === 'Tăng ca').length
  const absent = filtered.filter(a => a.status === 'Vắng mặt').length
  const totalOTH = filtered.reduce((s, a) => s + ((a.overtime_minutes || 0) / 60), 0)

  const months = useMemo(() => {
    return [...new Set(records.map(a => a.work_date.slice(0, 7)))].sort().reverse()
  }, [records])

  useEffect(() => {
    if (!form.shift_id || !shifts.length) return

    const sh = shifts.find(s => s.shift_id === form.shift_id)
    if (!sh) return

    // 1. If both are empty -> Vắng mặt
    if (!form.check_in && !form.check_out) {
      setForm(p => {
        if (p.status === 'Vắng mặt' && p.work_minutes === 0) return p
        return { ...p, status: 'Vắng mặt', work_minutes: 0, late_minutes: 0, early_leave_minutes: 0 }
      })
      return
    }

    // 2. If check_in exists but check_out is empty -> Thiếu check-out
    if (form.check_in && !form.check_out) {
      setForm(p => {
        if (p.status === 'Thiếu check-out' && p.work_minutes === 0) return p
        return { ...p, status: 'Thiếu check-out', work_minutes: 0, late_minutes: 0, early_leave_minutes: 0 }
      })
      return
    }

    // 3. If check_out exists but check_in is empty -> Thiếu check-in
    if (!form.check_in && form.check_out) {
      setForm(p => {
        if (p.status === 'Thiếu check-in' && p.work_minutes === 0) return p
        return { ...p, status: 'Thiếu check-in', work_minutes: 0, late_minutes: 0, early_leave_minutes: 0 }
      })
      return
    }

    // 4. Both check-in and check-out exist
    const checkInMin = parseTimeToMinutes(form.check_in)
    const checkOutMin = parseTimeToMinutes(form.check_out)
    const shiftStartMin = parseTimeToMinutes(sh.start_time)
    const shiftEndMin = parseTimeToMinutes(sh.end_time)
    const gracePeriod = 15 // 15 mins grace period

    const late = Math.max(0, checkInMin - shiftStartMin - gracePeriod)
    const earlyLeave = Math.max(0, shiftEndMin - checkOutMin - gracePeriod)

    let totalWorkMin = 0
    if (checkOutMin > checkInMin) {
      totalWorkMin = Math.max(0, checkOutMin - checkInMin - (sh.break_min || 0))
    }

    let status: AttendanceStatus = 'Đúng giờ'
    if (late > 0 && earlyLeave > 0) {
      status = 'Đi trễ & Về sớm'
    } else if (late > 0) {
      status = 'Đi trễ'
    } else if (earlyLeave > 0) {
      status = 'Về sớm'
    }

    if ((form.overtime_minutes || 0) > 0 && status === 'Đúng giờ') {
      status = 'Tăng ca'
    }

    setForm(p => {
      if (
        p.status === status &&
        p.work_minutes === totalWorkMin &&
        p.late_minutes === late &&
        p.early_leave_minutes === earlyLeave
      ) {
        return p
      }
      return {
        ...p,
        status,
        work_minutes: totalWorkMin,
        late_minutes: late,
        early_leave_minutes: earlyLeave
      }
    })
  }, [form.check_in, form.check_out, form.overtime_minutes, form.shift_id, shifts])

  function openAdd() {
    setEditTarget(null)
    setForm(emptyForm(employees, shifts))
    setModalOpen(true)
  }

  function openEdit(att: Attendance) {
    setEditTarget(att)
    setForm({ 
      ...att,
      work_minutes: att.work_minutes || 0,
      overtime_minutes: att.overtime_minutes || 0,
      late_minutes: att.late_minutes || 0,
      early_leave_minutes: att.early_leave_minutes || 0,
      employee_name: att.employee_name ?? '',
      shift_name: att.shift_name ?? '',
      status: att.status as AttendanceStatus,
      checked_by: att.checked_by ?? ''
    })
    setModalOpen(true)
  }

  async function handleSave() {
    const empName = employees.find(e => e.employee_id === form.employee_id)?.full_name ?? ''
    const shiftName = shifts.find(s => s.shift_id === form.shift_id)?.shift_name ?? ''

    let currentUserName = 'Admin Quản trị'
    if (auth) {
      if (auth.role === 'ADMIN') {
        currentUserName = 'Admin Quản trị'
      } else if (auth.role === 'EMPLOYEE' && auth.empId) {
        const currentEmp = employees.find(e => e.employee_id === auth.empId)
        currentUserName = currentEmp ? currentEmp.employee_code : 'Nhân viên'
      }
    }

    const record: Attendance = {
      ...form,
      employee_name: empName,
      shift_name: shiftName,
      checked_by: currentUserName,
    }

    let next: Attendance[]
    if (editTarget) {
      if (auth?.role === 'EMPLOYEE' && editTarget.checked_by === 'Admin Quản trị') {
        showToast('Ngày này đã được Admin xác nhận chấm công, bạn không thể thay đổi.', 'warning')
        return
      }
      next = records.map(r => r.attendance_id === editTarget.attendance_id ? record : r)
    } else {
      const alreadyExistsAdmin = records.find(r => r.employee_id === record.employee_id && r.work_date === record.work_date && r.checked_by === 'Admin Quản trị')
      if (auth?.role === 'EMPLOYEE' && alreadyExistsAdmin) {
        showToast('Ngày này đã được Admin xác nhận chấm công, bạn không thể tạo bản ghi mới.', 'warning')
        return
      }
      record.attendance_id = genId('ATT', records)
      next = [...records, record]
    }

    setSaving(true)
    try {
      await saveAttendances(next)
      setRecords(next)
      showToast(editTarget ? 'Cập nhật chấm công thành công!' : 'Thêm chấm công thành công!', 'success')
      // Ghi nhật ký vào Database
      logActivity(
        editTarget ? 'UPDATE' : 'CREATE',
        'cham-cong',
        record.attendance_id,
        editTarget
          ? `Cập nhật chấm công ngày ${record.work_date} của ${record.employee_name}`
          : `Thêm chấm công ngày ${record.work_date} của ${record.employee_name}`
      )
      setModalOpen(false)
    } catch (err: any) {
      showToast('Lỗi lưu: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(att: Attendance) {
    const next = records.filter(r => r.attendance_id !== att.attendance_id)
    setSaving(true)
    try {
      await saveAttendances(next)
      setRecords(next)
      showToast('Xóa bản ghi chấm công thành công!', 'success')
      logActivity('DELETE', 'cham-cong', att.attendance_id, `Xóa chấm công ngày ${att.work_date} của ${att.employee_name}`)
    } catch (err: any) {
      showToast('Lỗi xóa: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const f = form

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">sync</span>
        <p className="mt-3 text-sm text-slate-500">Đang cập nhật dữ liệu…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <span className="material-symbols-outlined text-4xl text-red-400">error</span>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 text-sm font-semibold rounded-xl" style={{ background: '#bde619' }}>Thử lại</button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Chấm công"
        subtitle={`Theo dõi ${records.length} bản ghi từ DB`}
        actions={
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl text-slate-900 hover:opacity-90 transition-all"
            style={{ background: '#bde619' }}
          >
            <span className="material-symbols-outlined text-[16px]">{auth?.role === 'ADMIN' ? 'add' : 'how_to_reg'}</span>
            {auth?.role === 'ADMIN' ? 'Thêm bản ghi' : 'Báo cáo chấm công'}
          </button>
        }
      />

      {/* Summary */}
      <div className="shrink-0 px-5 py-3 bg-white border-b border-slate-200 flex gap-4 flex-wrap">
        {[
          { label: 'Đúng giờ', val: onTime, bg: '#dcfce7', text: '#166534' },
          { label: 'Đi trễ', val: late, bg: '#fef3c7', text: '#92400e' },
          { label: 'Tăng ca', val: overtime, bg: '#fefce8', text: '#713f12' },
          { label: 'Vắng mặt', val: absent, bg: '#fee2e2', text: '#991b1b' },
          { label: 'Tổng giờ OT', val: `${totalOTH.toFixed(1)}h`, bg: '#f0fdf4', text: '#166534' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: s.bg }}>
            <span className="text-xs font-semibold" style={{ color: s.text }}>{s.label}:</span>
            <span className="text-xs font-black" style={{ color: s.text }}>{s.val}</span>
          </div>
        ))}
        {saving && <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
          <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>Đang lưu…
        </span>}
      </div>

      {/* Filters */}
      <div className="shrink-0 px-5 py-3 bg-slate-50 border-b border-slate-200 flex gap-3 flex-wrap items-center">
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {auth?.role === 'ADMIN' && viewTab === 'list' && (
          <select value={empFilter} onChange={e => setEmpFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
            <option value="all">Tất cả nhân viên</option>
            {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.full_name}</option>)}
          </select>
        )}
        {viewTab === 'list' && (
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
            <option value="all">Tất cả trạng thái</option>
            {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        <div className="flex bg-white rounded-xl border border-slate-200 p-0.5 ml-auto">
          <button onClick={() => setViewTab('list')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${viewTab === 'list' ? 'bg-[#bde619] text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            Danh sách
          </button>
          {auth?.role === 'ADMIN' && (
            <button onClick={() => setViewTab('summary')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${viewTab === 'summary' ? 'bg-[#bde619] text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              Tổng kết tháng
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {viewTab === 'list' ? (
          <>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                <tr className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Ngày</th>
                  <th className="text-left px-3 py-3">Người chấm công</th>
                  <th className="text-left px-3 py-3">Nhân viên</th>
                  <th className="text-left px-3 py-3">Ca làm</th>
                  <th className="text-center px-3 py-3">Vào</th>
                  <th className="text-center px-3 py-3">Ra</th>
                  <th className="text-center px-3 py-3">Tăng ca</th>
                  <th className="text-left px-3 py-3">Trạng thái</th>
                  <th className="text-left px-3 py-3">Ghi chú</th>
                  <th className="px-3 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(att => (
                  <tr key={att.attendance_id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-5 py-3 text-xs font-semibold text-slate-700">{formatDate(att.work_date)}</td>
                    <td className="px-3 py-3 text-xs font-medium text-slate-600">{att.checked_by || 'Admin Quản trị'}</td>
                    <td className="px-3 py-3 text-xs font-medium text-slate-900">{att.employee_name}</td>
                    <td className="px-3 py-3 text-xs text-slate-500">{att.shift_name}</td>
                    <td className="px-3 py-3 text-center text-xs font-mono text-slate-700">{att.check_in ? att.check_in.split(' ').pop()?.slice(0, 5) : '—'}</td>
                    <td className="px-3 py-3 text-center text-xs font-mono text-slate-700">{att.check_out ? att.check_out.split(' ').pop()?.slice(0, 5) : '—'}</td>
                    <td className="px-3 py-3 text-center">
                      {att.overtime_minutes ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#fefce8', color: '#713f12' }}>+{(att.overtime_minutes / 60).toFixed(1)}h</span>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${getAttendanceStatusColor(att.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_DOT[att.status] ?? '#94a3b8' }} />
                        {att.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-700 max-w-[200px] truncate" title={att.note || ''}>{att.note || '—'}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex gap-1.5 opacity-80 group-hover:opacity-100 transition-all">
                        {!(auth?.role === 'EMPLOYEE' && att.checked_by === 'Admin Quản trị') ? (
                          <button onClick={() => openEdit(att)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors" title="Chỉnh sửa">
                            <span className="material-symbols-outlined text-[19px]" style={{ fontVariationSettings: "'wght' 600" }}>edit</span>
                          </button>
                        ) : (
                          <button className="p-1.5 rounded-lg text-slate-300 cursor-not-allowed" title="Ngày này đã được Admin xác nhận, không thể chỉnh sửa">
                            <span className="material-symbols-outlined text-[19px]" style={{ fontVariationSettings: "'wght' 600" }}>edit</span>
                          </button>
                        )}
                        {auth?.role === 'ADMIN' && (
                          <button onClick={() => setDeleteTarget(att)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors" title="Xóa">
                            <span className="material-symbols-outlined text-[19px]" style={{ fontVariationSettings: "'wght' 600" }}>delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl">calendar_today</span>
                <p className="mt-2 text-sm">Không có dữ liệu chấm công</p>
              </div>
            )}
          </>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                <tr className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Mã NV</th>
                  <th className="text-left px-3 py-3">Nhân viên</th>
                  <th className="text-center px-3 py-3">Công chuẩn</th>
                  <th className="text-center px-3 py-3">Công thực tế</th>
                  <th className="text-center px-3 py-3">Giờ tăng ca</th>
                  <th className="text-center px-3 py-3">Đi muộn</th>
                  <th className="text-center px-3 py-3">Về sớm</th>
                  <th className="text-center px-3 py-3">Vắng mặt</th>
                  <th className="text-center px-3 py-3">Nghỉ phép</th>
                  <th className="text-left px-5 py-3">Đề xuất Thưởng/Phạt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {employees.map(emp => {
                  const atts = records.filter(r => r.employee_id === emp.employee_id && r.work_date.startsWith(monthFilter))
                  let actualDays = 0
                  let overtimeHours = 0
                  let lateTimes = 0
                  let earlyTimes = 0
                  let absentTimes = 0
                  let leaveDays = 0

                  atts.forEach(a => {
                    if (['Đúng giờ', 'Đi trễ', 'Về sớm', 'Đi trễ & Về sớm', 'Tăng ca', 'Nghỉ phép'].includes(a.status)) {
                      actualDays++
                    }
                    if (a.status.includes('Đi trễ') || (a.late_minutes && a.late_minutes > 0)) lateTimes++
                    if (a.status.includes('Về sớm') || (a.early_leave_minutes && a.early_leave_minutes > 0)) earlyTimes++
                    if (a.status === 'Vắng mặt') absentTimes++
                    if (a.status === 'Nghỉ phép') leaveDays++
                    overtimeHours += (a.overtime_minutes || 0) / 60
                  })

                  // Determine Rewards/Penalties
                  const rewards: string[] = []
                  const penalties: string[] = []

                  if (actualDays >= 22) {
                    if (overtimeHours >= 10) {
                      rewards.push('Thưởng chuyên cần + tăng ca (+500k)')
                    } else if (lateTimes === 0 && earlyTimes === 0 && absentTimes === 0) {
                      rewards.push('Thưởng chuyên cần xuất sắc (+300k)')
                    }
                  }
                  if (lateTimes >= 3 || earlyTimes >= 3) {
                    penalties.push('Phạt đi muộn/về sớm (-150k)')
                  }
                  if (absentTimes >= 1) {
                    penalties.push(`Phạt vắng mặt không phép (-${absentTimes * 200}k)`)
                  }

                  return (
                    <tr key={emp.employee_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-xs font-semibold text-slate-700">{emp.employee_code}</td>
                      <td className="px-3 py-3 text-xs font-semibold text-slate-900">{emp.full_name}</td>
                      <td className="px-3 py-3 text-center text-xs text-slate-600">22</td>
                      <td className="px-3 py-3 text-center text-xs font-bold text-slate-800">{actualDays}</td>
                      <td className="px-3 py-3 text-center text-xs font-medium text-slate-600">{overtimeHours.toFixed(1)}h</td>
                      <td className="px-3 py-3 text-center text-xs text-red-500">{lateTimes}</td>
                      <td className="px-3 py-3 text-center text-xs text-orange-500">{earlyTimes}</td>
                      <td className="px-3 py-3 text-center text-xs text-red-600 font-bold">{absentTimes}</td>
                      <td className="px-3 py-3 text-center text-xs text-blue-500">{leaveDays}</td>
                      <td className="px-5 py-3 text-xs font-semibold">
                        {rewards.length > 0 && (
                          <div className="text-emerald-600">{rewards.join(', ')}</div>
                        )}
                        {penalties.length > 0 && (
                          <div className="text-rose-600">{penalties.join(', ')}</div>
                        )}
                        {rewards.length === 0 && penalties.length === 0 && (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {employees.length === 0 && (
              <div className="py-16 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl">group</span>
                <p className="mt-2 text-sm">Không có dữ liệu nhân viên</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        {viewTab === 'list' ? (
          <>
            <span>Hiển thị <strong>{filtered.length}</strong> / <strong>{records.length}</strong> bản ghi</span>
            <button onClick={() => exportAttendances(filtered)} className="flex items-center gap-1.5 font-semibold hover:text-slate-700 transition-colors">
              <span className="material-symbols-outlined text-[14px]">download</span>Xuất Excel ({filtered.length})
            </button>
          </>
        ) : (
          <>
            <span>Tổng cộng <strong>{employees.length}</strong> nhân sự được kết xuất báo cáo tháng</span>
            <button onClick={() => exportMonthlySummary(monthFilter, employees, records)} className="flex items-center gap-1.5 font-semibold hover:text-slate-700 transition-colors">
              <span className="material-symbols-outlined text-[14px]">download</span>Xuất Excel Tổng kết
            </button>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editTarget ? 'Chỉnh sửa bản ghi chấm công' : 'Thêm bản ghi chấm công'}
        subtitle={editTarget ? `ID: ${editTarget.attendance_id}` : 'Nhập thông tin chấm công mới'}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nhân viên *</label>
            <select value={f.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
              {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.full_name} ({e.employee_code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ngày làm việc *</label>
            <input type="date" value={f.work_date} onChange={e => setForm(p => ({ ...p, work_date: e.target.value }))}
              disabled={auth?.role === 'EMPLOYEE'}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 disabled:opacity-60 disabled:cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ca làm việc *</label>
            <select value={f.shift_id} onChange={e => {
              const sid = e.target.value;
              const sh = shifts.find(s => s.shift_id === sid);
              setForm(p => ({
                ...p,
                shift_id: sid,
                ...(sh ? {
                  check_in: sh.start_time,
                  check_out: sh.end_time,
                  work_minutes: (sh.work_hours || 8) * 60
                } : {})
              }));
            }}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
              {shifts.map(s => <option key={s.shift_id} value={s.shift_id}>{s.shift_name} ({s.start_time}–{s.end_time})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Giờ vào</label>
            <input type="time" value={f.check_in} onChange={e => setForm(p => ({ ...p, check_in: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Giờ ra</label>
            <input type="time" value={f.check_out} onChange={e => setForm(p => ({ ...p, check_out: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-bold text-slate-500">Số giờ làm</label>
            <input type="text" readOnly disabled value={formatMinutesFriendly(f.work_minutes || 0)}
              className="w-full px-3 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-600 cursor-not-allowed font-medium" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-bold text-slate-500">Giờ tăng ca</label>
            <input type="text" readOnly disabled value={formatMinutesFriendly(f.overtime_minutes || 0)}
              className="w-full px-3 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-600 cursor-not-allowed font-medium" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Trạng thái *</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_LIST.map(s => (
                <button key={s} type="button" onClick={() => setForm(p => ({ ...p, status: s as AttendanceStatus }))}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${f.status === s ? 'border-transparent' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  style={f.status === s ? { background: STATUS_DOT[s] + '25', borderColor: STATUS_DOT[s], color: STATUS_DOT[s] } : {}}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ghi chú</label>
            <input type="text" value={f.note} placeholder="Lý do đi trễ, tăng ca, vắng mặt..."
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-5 border-t border-slate-100">
          <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">Hủy bỏ</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 text-sm font-bold rounded-xl text-slate-900 hover:opacity-90 transition-all disabled:opacity-50"
            style={{ background: '#bde619' }}>
            {saving ? 'Đang lưu…' : editTarget ? 'Cập nhật' : 'Thêm mới'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget) }}
        title="Xóa bản ghi chấm công?"
        message={`Bạn có chắc muốn xóa bản ghi ngày ${deleteTarget ? formatDate(deleteTarget.work_date) : ''} của ${deleteTarget?.employee_name}?`}
        confirmLabel="Xóa"
        danger
      />
    </div>
  )
}
