'use client'
import { useState, useMemo, useEffect } from 'react'
import { fetchData, saveLeaveRequests, logActivity } from '@/lib/store'
import { exportLeaveRequests } from '@/lib/excel'
import { formatDate, getLeaveStatusColor } from '@/lib/utils'
import { TopBar } from '@/components/TopBar'
import { Modal } from '@/components/Modal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { LeaveRequest, LeaveStatus, LeaveType, Employee } from '@/lib/types'

const LEAVE_TYPES: LeaveType[] = ['Nghỉ phép năm', 'Nghỉ ốm', 'Nghỉ không lương', 'Nghỉ chế độ', 'Việc riêng']
const BORDER_COLOR: Record<string, string> = {
  'Chờ duyệt': '#f59e0b', 'Đã duyệt': '#10b981', 'Từ chối': '#ef4444',
}
// Màu hiển thị trên lịch theo loại nghỉ
const LEAVE_TYPE_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  'Nghỉ phép năm': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  'Nghỉ ốm':       { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  'Nghỉ không lương': { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
  'Nghỉ chế độ':   { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
  'Việc riêng':    { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const MONTHS_VN = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
                   'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']

function daysBetween(from: string, to: string): number {
  const a = new Date(from), b = new Date(to)
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1)
}

function emptyForm(employees: Employee[]): Partial<LeaveRequest> & {
  employee_id: string; leave_type: LeaveType; from_date: string; to_date: string; reason: string
} {
  return {
    employee_id: employees[0]?.employee_id ?? '',
    leave_type: 'Nghỉ phép năm',
    from_date: new Date().toISOString().slice(0, 10),
    to_date: new Date().toISOString().slice(0, 10),
    reason: '',
    status: 'Chờ duyệt',
    approved_by: '',
  }
}

function genId(list: LeaveRequest[]) {
  const nums = list.map(r => parseInt(r.leave_id.replace(/\D/g, '') || '0'))
  return `LV-${String(Math.max(0, ...nums) + 1).padStart(6, '0')}`
}

// ── Calendar helpers ──────────────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}
function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// Returns all leave records that overlap with a given date
function getLeavesForDate(records: LeaveRequest[], dateStr: string): LeaveRequest[] {
  return records.filter(l => {
    if (l.status === 'Từ chối') return false
    return dateStr >= l.from_date && dateStr <= l.to_date
  })
}

// ── Calendar View Component ───────────────────────────────────────────────────
function CalendarView({
  records, calYear, calMonth, setCalYear, setCalMonth,
  onDayClick, empFilter, statusFilter,
}: {
  records: LeaveRequest[]
  calYear: number; calMonth: number
  setCalYear: (y: number) => void; setCalMonth: (m: number) => void
  onDayClick: (leaves: LeaveRequest[], dateStr: string) => void
  empFilter: string; statusFilter: string
}) {
  const filtered = records.filter(l => {
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    const matchEmp = empFilter === 'all' || l.employee_id === empFilter
    return matchStatus && matchEmp
  })

  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)
  const today = toYMD(new Date())

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) }
    else setCalMonth(calMonth - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) }
    else setCalMonth(calMonth + 1)
  }

  // Build grid cells (blanks + days)
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  // Pad to complete rows
  while (cells.length % 7 !== 0) cells.push(null)

  // Stats for the month
  const monthApproved = filtered.filter(l => {
    const start = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`
    const end = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
    return l.status === 'Đã duyệt' && l.from_date <= end && l.to_date >= start
  })
  const monthPending = filtered.filter(l => l.status === 'Chờ duyệt').length
  const uniqueOnLeave = new Set(monthApproved.map(l => l.employee_id)).size

  return (
    <div className="flex flex-col h-full">
      {/* Calendar header + nav */}
      <div className="px-5 py-3 bg-white border-b border-slate-200 flex items-center gap-3 shrink-0">
        <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-[18px] text-slate-600">chevron_left</span>
        </button>
        <h2 className="text-base font-black text-slate-900 min-w-[160px] text-center">
          {MONTHS_VN[calMonth]} {calYear}
        </h2>
        <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-[18px] text-slate-600">chevron_right</span>
        </button>
        <button onClick={() => { const n = new Date(); setCalYear(n.getFullYear()); setCalMonth(n.getMonth()) }}
          className="ml-2 px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600">
          Hôm nay
        </button>

        {/* Stat chips */}
        <div className="ml-auto flex gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full font-semibold bg-emerald-100 text-emerald-700">
            {uniqueOnLeave} NV đã nghỉ
          </span>
          {monthPending > 0 && (
            <span className="px-2.5 py-1 rounded-full font-semibold bg-amber-100 text-amber-700">
              {monthPending} chờ duyệt
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex gap-3 ml-3 border-l border-slate-200 pl-3">
          {Object.entries(LEAVE_TYPE_COLOR).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color.bg, border: `1.5px solid ${color.border}` }} />
              <span className="text-[10px] text-slate-500 whitespace-nowrap">{type.replace('Nghỉ ', '')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-7 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Weekday headers */}
          {WEEKDAYS.map((d, i) => (
            <div key={d} className={`py-2 text-center text-[11px] font-bold uppercase tracking-wider border-b border-slate-100
              ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-500'}`}>
              {d}
            </div>
          ))}

          {/* Day cells */}
          {cells.map((day, idx) => {
            if (!day) return (
              <div key={`blank-${idx}`} className="h-28 bg-slate-50/50 border-b border-r border-slate-100 last:border-r-0" />
            )
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const leaves = getLeavesForDate(filtered, dateStr)
            const isToday = dateStr === today
            const dow = (firstDay + day - 1) % 7
            const isWeekend = dow === 0 || dow === 6

            return (
              <div
                key={dateStr}
                onClick={() => leaves.length > 0 && onDayClick(leaves, dateStr)}
                className={`h-28 border-b border-r border-slate-100 last:border-r-0 p-1.5 flex flex-col gap-1 overflow-hidden transition-colors
                  ${leaves.length > 0 ? 'cursor-pointer hover:bg-slate-50' : ''}
                  ${isWeekend ? 'bg-slate-50/40' : 'bg-white'}
                  ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}
                `}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-colors
                    ${isToday ? 'text-white' : isWeekend ? 'text-slate-400' : 'text-slate-700'}`}
                    style={isToday ? { background: '#bde619', color: '#1a2e05' } : {}}>
                    {day}
                  </span>
                  {leaves.length > 1 && (
                    <span className="text-[9px] font-bold text-slate-400">{leaves.length} người</span>
                  )}
                </div>

                {/* Leave events */}
                {leaves.slice(0, 3).map((l, i) => {
                  const c = LEAVE_TYPE_COLOR[l.leave_type] ?? { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }
                  const isFirst = dateStr === l.from_date
                  const isLast = dateStr === l.to_date
                  return (
                    <div key={`${l.leave_id}-${i}`}
                      className={`px-1.5 py-0.5 text-[10px] font-semibold leading-tight truncate
                        ${!isFirst && !isLast ? 'rounded-none' : ''}
                        ${isFirst ? 'rounded-l' : ''}
                        ${isLast ? 'rounded-r' : ''}
                        ${!isFirst && !isLast ? 'opacity-90' : ''}
                      `}
                      style={{
                        background: c.bg,
                        color: c.text,
                        borderLeft: isFirst ? `2px solid ${c.border}` : undefined,
                      }}
                      title={`${l.employee_name} — ${l.leave_type} (${l.days} ngày)`}
                    >
                      {isFirst ? (l.employee_name?.split(' ').pop() ?? '') : '─'}
                    </div>
                  )
                })}
                {leaves.length > 3 && (
                  <span className="text-[9px] text-slate-400 font-semibold pl-1">+{leaves.length - 3} nữa</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DonTuPage() {
  const [records, setRecords] = useState<LeaveRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [empMap, setEmpMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // View mode: 'list' | 'calendar'
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  const [statusFilter, setStatusFilter] = useState('all')
  const [empFilter, setEmpFilter] = useState('all')
  const [selected, setSelected] = useState<LeaveRequest | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<LeaveRequest | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LeaveRequest | null>(null)
  const [form, setForm] = useState(emptyForm([]))
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null)

  // Calendar state
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calDayModal, setCalDayModal] = useState<{ leaves: LeaveRequest[]; date: string } | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchData().then(data => {
      const activeEmps = data.employees.filter(e => e.status === 'Active')
      const map = Object.fromEntries(data.employees.map(e => [e.employee_id, e.full_name]))
      setEmployees(activeEmps)
      setEmpMap(map)
      setRecords(data.leaveRequests.map(l => ({
        ...l,
        employee_name: map[l.employee_id] ?? l.employee_name ?? '',
        approver_name: l.approved_by ? map[l.approved_by] ?? '' : '',
      })))
      setForm(emptyForm(activeEmps))
      setLoading(false)
    }).catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const filtered = useMemo(() => records.filter(l => {
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    const matchEmp = empFilter === 'all' || l.employee_id === empFilter
    return matchStatus && matchEmp
  }).sort((a, b) => b.created_at.localeCompare(a.created_at)), [records, statusFilter, empFilter])

  const pending = records.filter(l => l.status === 'Chờ duyệt').length
  const approved = records.filter(l => l.status === 'Đã duyệt').length
  const rejected = records.filter(l => l.status === 'Từ chối').length

  function openAdd() {
    setEditTarget(null)
    setForm(emptyForm(employees))
    setModalOpen(true)
  }

  function openEdit(l: LeaveRequest) {
    setEditTarget(l)
    setForm({ ...l })
    setModalOpen(true)
  }

  async function handleSave() {
    const days = daysBetween(form.from_date!, form.to_date!)
    const record: LeaveRequest = {
      leave_id: editTarget?.leave_id ?? genId(records),
      employee_id: form.employee_id!,
      leave_type: form.leave_type!,
      from_date: form.from_date!,
      to_date: form.to_date!,
      days,
      reason: form.reason!,
      status: (form.status as LeaveStatus) ?? 'Chờ duyệt',
      approved_by: form.approved_by ?? '',
      created_at: editTarget?.created_at ?? new Date().toISOString(),
      employee_name: empMap[form.employee_id!] ?? '',
      approver_name: form.approved_by ? empMap[form.approved_by] ?? '' : '',
    }
    let next: LeaveRequest[]
    if (editTarget) {
      next = records.map(r => r.leave_id === editTarget.leave_id ? record : r)
    } else {
      next = [...records, record]
    }
    setSaving(true)
    try {
      await saveLeaveRequests(next)
      setRecords(next)
      if (selected?.leave_id === editTarget?.leave_id) setSelected(record)
      logActivity(
        editTarget ? 'UPDATE' : 'CREATE',
        'don-xin-nghi',
        record.leave_id,
        editTarget
          ? `Cập nhật đơn ${record.leave_type} của ${record.employee_name}`
          : `Tạo đơn ${record.leave_type} của ${record.employee_name} (${record.days} ngày)`
      )
      setModalOpen(false)
    } catch (err: any) { alert('Lỗi lưu: ' + err.message) }
    finally { setSaving(false) }
  }

  async function handleApprove(leave: LeaveRequest) {
    const updated = { ...leave, status: 'Đã duyệt' as LeaveStatus, approved_by: 'EMP-000001', approver_name: 'Admin' }
    const next = records.map(r => r.leave_id === leave.leave_id ? updated : r)
    setSaving(true)
    try {
      await saveLeaveRequests(next)
      setRecords(next)
      if (selected?.leave_id === leave.leave_id) setSelected(updated)
      logActivity('APPROVE', 'don-xin-nghi', leave.leave_id, `Duyệt đơn ${leave.leave_type} của ${leave.employee_name}`)
    } catch (err: any) { alert('Lỗi: ' + err.message) }
    finally { setSaving(false) }
  }

  async function handleReject(leave: LeaveRequest) {
    const updated = { ...leave, status: 'Từ chối' as LeaveStatus }
    const next = records.map(r => r.leave_id === leave.leave_id ? updated : r)
    setSaving(true)
    try {
      await saveLeaveRequests(next)
      setRecords(next)
      if (selected?.leave_id === leave.leave_id) setSelected(updated)
      logActivity('REJECT', 'don-xin-nghi', leave.leave_id, `Từ chối đơn ${leave.leave_type} của ${leave.employee_name}`)
    } catch (err: any) { alert('Lỗi: ' + err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(leave: LeaveRequest) {
    const next = records.filter(r => r.leave_id !== leave.leave_id)
    setSaving(true)
    try {
      await saveLeaveRequests(next)
      setRecords(next)
      if (selected?.leave_id === leave.leave_id) setSelected(null)
      logActivity('DELETE', 'don-xin-nghi', leave.leave_id, `Xóa đơn ${leave.leave_type} của ${leave.employee_name}`)
    } catch (err: any) { alert('Lỗi xóa: ' + err.message) }
    finally { setSaving(false) }
  }

  const f = form

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">sync</span>
        <p className="mt-3 text-sm text-slate-500">Đang tải dữ liệu từ Excel…</p>
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
        title="Quản lý Đơn từ"
        subtitle="Xin nghỉ phép, nghỉ ốm và các loại đơn từ khác"
        actions={
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>Đang lưu…
            </span>}

            {/* View Toggle */}
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                  ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <span className="material-symbols-outlined text-[14px]">list</span>Danh sách
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                  ${viewMode === 'calendar' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <span className="material-symbols-outlined text-[14px]">calendar_month</span>Lịch
              </button>
            </div>

            <button onClick={openAdd}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl text-slate-900 hover:opacity-90 transition-all"
              style={{ background: '#bde619' }}>
              <span className="material-symbols-outlined text-[16px]">add</span>Tạo đơn mới
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="shrink-0 px-5 py-3 bg-white border-b border-slate-200 flex gap-4">
        {[
          { label: 'Chờ duyệt', val: pending, bg: '#f59e0b', text: '#ffffff', status: 'Chờ duyệt' },
          { label: 'Đã duyệt', val: approved, bg: '#dcfce7', text: '#166534', status: 'Đã duyệt' },
          { label: 'Từ chối', val: rejected, bg: '#fee2e2', text: '#991b1b', status: 'Từ chối' },
        ].map(s => (
          <div key={s.label}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: s.bg }}
            onClick={() => setStatusFilter(prev => prev === s.status ? 'all' : s.status)}
          >
            <span className="text-xs font-semibold" style={{ color: s.text }}>{s.label}:</span>
            <span className="text-sm font-black" style={{ color: s.text }}>{s.val}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="shrink-0 px-5 py-3 bg-slate-50 border-b border-slate-200 flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
          <option value="all">Tất cả trạng thái</option>
          <option value="Chờ duyệt">Chờ duyệt</option>
          <option value="Đã duyệt">Đã duyệt</option>
          <option value="Từ chối">Từ chối</option>
        </select>
        <select value={empFilter} onChange={e => setEmpFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
          <option value="all">Tất cả nhân viên</option>
          {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.full_name}</option>)}
        </select>
        <span className="text-xs text-slate-500 flex items-center">{filtered.length} đơn</span>
        <button onClick={() => exportLeaveRequests(filtered)}
          className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors">
          <span className="material-symbols-outlined text-[14px]">download</span>Xuất Excel
        </button>
      </div>

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Card List */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(leave => (
                <div key={leave.leave_id}
                  onClick={() => setSelected(leave)}
                  className={`bg-white rounded-xl border-l-4 p-4 cursor-pointer hover:shadow-md transition-shadow group ${selected?.leave_id === leave.leave_id ? 'ring-2 ring-[#bde619]' : ''}`}
                  style={{ borderLeftColor: BORDER_COLOR[leave.status] }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500">{leave.leave_type}</span>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">{leave.employee_name}</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getLeaveStatusColor(leave.status)}`}>
                      {leave.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">
                    {formatDate(leave.from_date)} → {formatDate(leave.to_date)}
                    <span className="ml-2 text-slate-400">({leave.days} ngày)</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{leave.reason}</p>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">{leave.leave_id}</span>
                    <div className="flex gap-1.5">
                      <button onClick={e => { e.stopPropagation(); openEdit(leave) }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all" title="Chỉnh sửa">
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteTarget(leave) }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all" title="Xóa">
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                      {leave.status === 'Chờ duyệt' && (
                        <>
                          <button onClick={e => { e.stopPropagation(); handleApprove(leave) }}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                            Duyệt
                          </button>
                          <button onClick={e => { e.stopPropagation(); setRejectTarget(leave) }}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg text-red-700 bg-red-50 hover:bg-red-100 transition-colors">
                            Từ chối
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="py-16 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl">event_busy</span>
                <p className="mt-2 text-sm">Không có đơn từ nào</p>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="w-[300px] shrink-0 bg-white border-l border-slate-200 overflow-y-auto">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-sm">Chi tiết đơn từ</h3>
                <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">close</span>
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${getLeaveStatusColor(selected.status)}`}>
                    {selected.status}
                  </span>
                </div>
                {[
                  { label: 'Mã đơn', value: selected.leave_id },
                  { label: 'Nhân viên', value: selected.employee_name ?? '—' },
                  { label: 'Loại nghỉ', value: selected.leave_type },
                  { label: 'Từ ngày', value: formatDate(selected.from_date) },
                  { label: 'Đến ngày', value: formatDate(selected.to_date) },
                  { label: 'Số ngày', value: `${selected.days} ngày` },
                  { label: 'Lý do', value: selected.reason },
                  { label: 'Người duyệt', value: selected.approver_name || 'Chưa duyệt' },
                  { label: 'Ngày tạo', value: formatDate(selected.created_at) },
                ].map(fi => (
                  <div key={fi.label}>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{fi.label}</p>
                    <p className="text-sm font-medium text-slate-800">{fi.value}</p>
                  </div>
                ))}

                <div className="pt-3 space-y-2">
                  {selected.status === 'Chờ duyệt' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(selected)}
                        className="flex-1 text-sm font-bold py-2.5 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                        ✓ Duyệt đơn
                      </button>
                      <button onClick={() => setRejectTarget(selected)}
                        className="flex-1 text-sm font-bold py-2.5 rounded-xl text-red-700 bg-red-50 hover:bg-red-100 transition-colors">
                        ✕ Từ chối
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(selected)}
                      className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors">
                      Chỉnh sửa
                    </button>
                    <button onClick={() => setDeleteTarget(selected)}
                      className="flex-1 py-2 text-xs font-semibold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                      Xóa đơn
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CALENDAR VIEW ── */}
      {viewMode === 'calendar' && (
        <div className="flex-1 overflow-hidden">
          <CalendarView
            records={records}
            calYear={calYear} calMonth={calMonth}
            setCalYear={setCalYear} setCalMonth={setCalMonth}
            empFilter={empFilter} statusFilter={statusFilter}
            onDayClick={(leaves, date) => setCalDayModal({ leaves, date })}
          />
        </div>
      )}

      {/* ── CALENDAR DAY DETAIL MODAL ── */}
      {calDayModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setCalDayModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900">
                  Nhật ký nghỉ — {new Date(calDayModal.date + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{calDayModal.leaves.length} nhân viên nghỉ ngày này</p>
              </div>
              <button onClick={() => setCalDayModal(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <span className="material-symbols-outlined text-[18px] text-slate-500">close</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
              {calDayModal.leaves.map(l => {
                const c = LEAVE_TYPE_COLOR[l.leave_type] ?? { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }
                return (
                  <div key={l.leave_id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 text-white"
                          style={{ background: c.border }}>
                          {(l.employee_name ?? '?').split(' ').pop()?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{l.employee_name}</p>
                          <p className="text-[11px] text-slate-500">{l.leave_type} · {l.days} ngày</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${getLeaveStatusColor(l.status)}`}>
                        {l.status}
                      </span>
                    </div>
                    <div className="mt-2 ml-10">
                      <p className="text-xs text-slate-500">
                        {formatDate(l.from_date)} → {formatDate(l.to_date)}
                      </p>
                      {l.reason && (
                        <p className="text-xs text-slate-600 mt-1 italic line-clamp-2">"{l.reason}"</p>
                      )}
                      {l.status === 'Chờ duyệt' && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => { handleApprove(l); setCalDayModal(null) }}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                            ✓ Duyệt
                          </button>
                          <button onClick={() => { setRejectTarget(l); setCalDayModal(null) }}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg text-red-700 bg-red-50 hover:bg-red-100 transition-colors">
                            ✕ Từ chối
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button onClick={() => setCalDayModal(null)}
                className="w-full py-2.5 text-sm font-bold rounded-xl text-slate-900 hover:opacity-90 transition-all"
                style={{ background: '#bde619' }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editTarget ? 'Chỉnh sửa đơn từ' : 'Tạo đơn xin nghỉ mới'}
        subtitle={editTarget ? `Mã: ${editTarget.leave_id}` : 'Điền thông tin đơn xin nghỉ'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nhân viên *</label>
            <select value={f.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
              {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Loại nghỉ *</label>
            <div className="flex flex-wrap gap-2">
              {LEAVE_TYPES.map(t => (
                <button key={t} type="button" onClick={() => setForm(p => ({ ...p, leave_type: t }))}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${f.leave_type === t ? 'border-[#bde619] bg-[#bde619]/20 text-slate-900' : 'border-slate-200 text-slate-500'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Từ ngày *</label>
              <input type="date" value={f.from_date} onChange={e => setForm(p => ({ ...p, from_date: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Đến ngày *</label>
              <input type="date" value={f.to_date} onChange={e => setForm(p => ({ ...p, to_date: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
            </div>
          </div>
          {f.from_date && f.to_date && (
            <div className="px-3 py-2 bg-[#bde619]/10 border border-[#bde619]/30 rounded-xl text-xs font-semibold text-slate-700">
              Số ngày nghỉ: <strong>{daysBetween(f.from_date, f.to_date)} ngày</strong>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lý do *</label>
            <textarea value={f.reason} rows={3} placeholder="Nêu rõ lý do xin nghỉ..."
              onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-5 border-t border-slate-100">
          <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">Hủy bỏ</button>
          <button onClick={handleSave} disabled={!f.reason?.trim() || saving}
            className="flex-1 py-2.5 text-sm font-bold rounded-xl text-slate-900 hover:opacity-90 transition-all disabled:opacity-40"
            style={{ background: '#bde619' }}>
            {saving ? 'Đang lưu…' : editTarget ? 'Cập nhật' : 'Tạo đơn'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget) }}
        title="Xóa đơn từ?" message={`Xóa đơn ${deleteTarget?.leave_id} của ${deleteTarget?.employee_name}?`}
        confirmLabel="Xóa đơn" danger />

      <ConfirmDialog open={rejectTarget !== null} onClose={() => setRejectTarget(null)}
        onConfirm={() => { if (rejectTarget) handleReject(rejectTarget) }}
        title="Từ chối đơn từ?" message={`Từ chối đơn của ${rejectTarget?.employee_name} - ${rejectTarget?.leave_type}?`}
        confirmLabel="Từ chối" />
    </div>
  )
}
