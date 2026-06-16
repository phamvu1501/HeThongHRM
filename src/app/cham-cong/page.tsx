'use client'
import { useState, useMemo, useEffect } from 'react'
import { fetchData, saveAttendances, logActivity } from '@/lib/store'
import { exportAttendances } from '@/lib/excel'
import { formatDate, getAttendanceStatusColor } from '@/lib/utils'
import { getAuth, AuthUser } from '@/lib/auth'
import { TopBar } from '@/components/TopBar'
import { Modal } from '@/components/Modal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Attendance, AttendanceStatus, Employee, Shift } from '@/lib/types'

const STATUS_LIST: AttendanceStatus[] = ['Đúng giờ', 'Đi trễ', 'Về sớm', 'Vắng mặt', 'Tăng ca', 'Nghỉ phép']
const STATUS_DOT: Record<string, string> = {
  'Đúng giờ': '#10b981', 'Đi trễ': '#f59e0b', 'Về sớm': '#f97316',
  'Vắng mặt': '#ef4444', 'Tăng ca': '#bde619', 'Nghỉ phép': '#3b82f6',
}

function genId(prefix: string, list: { attendance_id: string }[]) {
  const nums = list.map(a => parseInt(a.attendance_id.replace(/\D/g, '') || '0'))
  return `ATT-${String(Math.max(0, ...nums) + 1).padStart(6, '0')}`
}

function emptyForm(employees: Employee[], shifts: Shift[]) {
  return {
    attendance_id: '',
    work_date: new Date().toISOString().slice(0, 10),
    employee_id: employees[0]?.employee_id ?? '',
    shift_id: shifts[0]?.shift_id ?? '',
    check_in: '08:00',
    check_out: '17:30',
    work_hours: 8,
    overtime_hours: 0,
    status: 'Đúng giờ' as AttendanceStatus,
    note: '',
    employee_name: '',
    shift_name: '',
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

  // ── Load data from Excel ──
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

  const filtered = useMemo(() => records.filter(a => {
    const matchEmp = empFilter === 'all' || a.employee_id === empFilter
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    const matchMonth = a.work_date.startsWith(monthFilter)
    return matchEmp && matchStatus && matchMonth
  }).sort((a, b) => b.work_date.localeCompare(a.work_date)), [records, empFilter, statusFilter, monthFilter])

  const onTime = filtered.filter(a => a.status === 'Đúng giờ').length
  const late = filtered.filter(a => a.status === 'Đi trễ').length
  const overtime = filtered.filter(a => a.status === 'Tăng ca').length
  const absent = filtered.filter(a => a.status === 'Vắng mặt').length
  const totalOTH = filtered.reduce((s, a) => s + a.overtime_hours, 0)

  const months = useMemo(() => {
    return [...new Set(records.map(a => a.work_date.slice(0, 7)))].sort().reverse()
  }, [records])

  function openAdd() {
    setEditTarget(null)
    setForm(emptyForm(employees, shifts))
    setModalOpen(true)
  }

  function openEdit(att: Attendance) {
    setEditTarget(att)
    setForm({ 
      ...att,
      employee_name: att.employee_name ?? '',
      shift_name: att.shift_name ?? ''
    })
    setModalOpen(true)
  }

  async function handleSave() {
    const empName = employees.find(e => e.employee_id === form.employee_id)?.full_name ?? ''
    const shiftName = shifts.find(s => s.shift_id === form.shift_id)?.shift_name ?? ''
    const record: Attendance = {
      ...form,
      employee_name: empName,
      shift_name: shiftName,
    }

    let next: Attendance[]
    if (editTarget) {
      next = records.map(r => r.attendance_id === editTarget.attendance_id ? record : r)
    } else {
      record.attendance_id = genId('ATT', records)
      next = [...records, record]
    }

    setSaving(true)
    try {
      await saveAttendances(next)
      setRecords(next)
      // Ghi nhật ký vào Excel
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
      alert('Lỗi lưu: ' + err.message)
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
      logActivity('DELETE', 'cham-cong', att.attendance_id, `Xóa chấm công ngày ${att.work_date} của ${att.employee_name}`)
    } catch (err: any) {
      alert('Lỗi xóa: ' + err.message)
    } finally {
      setSaving(false)
    }
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
        title="Chấm công"
        subtitle={`Theo dõi ${records.length} bản ghi từ file Excel`}
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
          <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>Đang lưu vào Excel…
        </span>}
      </div>

      {/* Filters */}
      <div className="shrink-0 px-5 py-3 bg-slate-50 border-b border-slate-200 flex gap-3 flex-wrap">
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {auth?.role === 'ADMIN' && (
          <select value={empFilter} onChange={e => setEmpFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
            <option value="all">Tất cả nhân viên</option>
            {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.full_name}</option>)}
          </select>
        )}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
          <option value="all">Tất cả trạng thái</option>
          {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
            <tr className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <th className="text-left px-5 py-3">Ngày</th>
              <th className="text-left px-3 py-3">Nhân viên</th>
              <th className="text-left px-3 py-3">Ca làm</th>
              <th className="text-center px-3 py-3">Vào</th>
              <th className="text-center px-3 py-3">Ra</th>
              <th className="text-center px-3 py-3">Giờ làm</th>
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
                <td className="px-3 py-3 text-xs font-medium text-slate-900">{att.employee_name}</td>
                <td className="px-3 py-3 text-xs text-slate-500">{att.shift_name}</td>
                <td className="px-3 py-3 text-center text-xs font-mono text-slate-700">{att.check_in || '—'}</td>
                <td className="px-3 py-3 text-center text-xs font-mono text-slate-700">{att.check_out || '—'}</td>
                <td className="px-3 py-3 text-center text-xs font-semibold text-slate-700">
                  {att.work_hours > 0 ? `${att.work_hours}h` : '—'}
                </td>
                <td className="px-3 py-3 text-center">
                  {att.overtime_hours > 0
                    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#fefce8', color: '#713f12' }}>+{att.overtime_hours}h</span>
                    : <span className="text-slate-300 text-xs">—</span>}
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${getAttendanceStatusColor(att.status)}`}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_DOT[att.status] ?? '#94a3b8' }} />
                    {att.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-slate-500 max-w-[160px] truncate">{att.note || '—'}</td>
                <td className="px-3 py-3 text-right">
                  <div className="inline-flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(att)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors" title="Chỉnh sửa">
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    {auth?.role === 'ADMIN' && (
                      <button onClick={() => setDeleteTarget(att)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Xóa">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
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
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <span>Hiển thị <strong>{filtered.length}</strong> / <strong>{records.length}</strong> bản ghi</span>
        <button onClick={() => exportAttendances(filtered)} className="flex items-center gap-1.5 font-semibold hover:text-slate-700 transition-colors">
          <span className="material-symbols-outlined text-[14px]">download</span>Xuất Excel ({filtered.length})
        </button>
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
            <select value={f.shift_id} onChange={e => setForm(p => ({ ...p, shift_id: e.target.value }))}
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Số giờ làm</label>
            <input type="number" step="0.5" min="0" max="24" value={f.work_hours}
              onChange={e => setForm(p => ({ ...p, work_hours: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Giờ tăng ca</label>
            <input type="number" step="0.5" min="0" max="10" value={f.overtime_hours}
              onChange={e => setForm(p => ({ ...p, overtime_hours: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Trạng thái *</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_LIST.map(s => (
                <button key={s} type="button" onClick={() => setForm(p => ({ ...p, status: s }))}
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
