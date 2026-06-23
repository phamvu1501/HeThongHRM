'use client'
import { useState, useMemo, useEffect } from 'react'
import { fetchData, saveEmployees, logActivity } from '@/lib/store'
import { exportEmployees } from '@/lib/excel'
import { formatDate, formatCurrency, getInitials, getAvatarColor, getStatusColor, getContractTypeColor } from '@/lib/utils'
import { getAuth, AuthUser } from '@/lib/auth'
import { TopBar } from '@/components/TopBar'
import { Modal } from '@/components/Modal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Employee, ContractType, Gender, Status, Department, Position } from '@/lib/types'

const CONTRACT_TYPES: ContractType[] = ['Full-time', 'Part-time', 'Probation', 'Contract']
const GENDERS: Gender[] = ['Nam', 'Nữ', 'Khác']

function emptyEmp(departments: Department[], positions: Position[]): Employee {
  return {
    employee_id: '', employee_code: '', full_name: '', gender: 'Nam',
    dob: '1995-01-01', phone: '', email: '', address: '',
    department_id: departments[0]?.department_id ?? '',
    department_name: departments[0]?.department_name ?? '',
    position_id: positions[0]?.position_id ?? '',
    position_name: positions[0]?.position_name ?? '',
    join_date: new Date().toISOString().slice(0, 10),
    contract_type: 'Full-time', base_salary: 15000000, bank_account_no: '',
    status: 'Active', created_at: new Date().toISOString().slice(0, 10),
  }
}

function genCode(list: Employee[]) {
  const nums = list.map(e => parseInt(e.employee_code.replace(/\D/g, '') || '0'))
  return `NV-${String(Math.max(0, ...nums) + 1).padStart(4, '0')}`
}
function genId(list: Employee[]) {
  const nums = list.map(e => parseInt(e.employee_id.replace(/\D/g, '') || '0'))
  return `EMP-${String(Math.max(0, ...nums) + 1).padStart(6, '0')}`
}

export default function NhanVienPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [auth, setAuth] = useState<AuthUser | null>(null)

  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Employee | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Employee | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)
  const [form, setForm] = useState<Employee>(emptyEmp([], []))

  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 20

  useEffect(() => {
    setLoading(true)
    const authData = getAuth()
    setAuth(authData)
    
    fetchData().then(data => {
      let filteredEmployees = data.employees
      if (authData?.role === 'EMPLOYEE' && authData.empId) {
        filteredEmployees = data.employees.filter(e => e.employee_id === authData.empId)
      }
      setEmployees(filteredEmployees)
      setDepartments(data.departments)
      setPositions(data.positions)
      setForm(emptyEmp(data.departments, data.positions))
      setLoading(false)
    }).catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const deptMap = Object.fromEntries(departments.map(d => [d.department_id, d.department_name]))
  const posMap = Object.fromEntries(positions.map(p => [p.position_id, p.position_name]))

  const enriched = useMemo(() => employees.map(e => ({
    ...e,
    department_name: deptMap[e.department_id] ?? e.department_name ?? '',
    position_name: posMap[e.position_id] ?? e.position_name ?? '',
  })), [employees, departments, positions])

  const filtered = useMemo(() => enriched.filter(e => {
    const matchSearch = !search ||
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase())
    const matchDept = deptFilter === 'all' || e.department_id === deptFilter
    const matchStatus = statusFilter === 'all' || e.status === statusFilter
    return matchSearch && matchDept && matchStatus
  }), [enriched, search, deptFilter, statusFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, deptFilter, statusFilter])

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, currentPage])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)

  function openAdd() {
    setEditTarget(null)
    setForm(emptyEmp(departments, positions))
    setModalOpen(true)
  }

  function openEdit(emp: Employee) {
    setEditTarget(emp)
    setForm({ ...emp })
    setModalOpen(true)
  }

  async function handleSave() {
    const record: Employee = {
      ...form,
      department_name: deptMap[form.department_id] ?? '',
      position_name: posMap[form.position_id] ?? '',
    }

    let next: Employee[]
    if (editTarget) {
      next = employees.map(e => e.employee_id === editTarget.employee_id ? record : e)
    } else {
      record.employee_id = genId(employees)
      record.employee_code = genCode(employees)
      record.created_at = new Date().toISOString().slice(0, 10)
      next = [...employees, record]
    }

    setSaving(true)
    try {
      await saveEmployees(next)
      setEmployees(next)
      if (editTarget && selected?.employee_id === editTarget.employee_id) setSelected(record)
      logActivity(
        editTarget ? 'UPDATE' : 'CREATE',
        'nhan-vien',
        record.employee_id,
        editTarget
          ? `Cập nhật nhân viên ${record.full_name} (${record.employee_code})`
          : `Thêm mới nhân viên ${record.full_name} (${record.employee_code})`
      )
      setModalOpen(false)
    } catch (err: any) {
      alert('Lỗi lưu: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(emp: Employee) {
    const next = employees.filter(e => e.employee_id !== emp.employee_id)
    setSaving(true)
    try {
      await saveEmployees(next)
      setEmployees(next)
      if (selected?.employee_id === emp.employee_id) setSelected(null)
      logActivity('DELETE', 'nhan-vien', emp.employee_id, `Xóa nhân viên ${emp.full_name} (${emp.employee_code})`)
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
        title="Quản lý Nhân viên"
        subtitle={`${filtered.length} / ${employees.length} nhân viên`}
        actions={
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>Đang lưu…
            </span>}
            {auth?.role === 'ADMIN' && (
              <button onClick={openAdd}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl text-slate-900 hover:opacity-90 transition-all"
                style={{ background: '#bde619' }}>
                <span className="material-symbols-outlined text-[16px]">person_add</span>Thêm mới
              </button>
            )}
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* List panel */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Filters */}
          <div className="shrink-0 px-5 py-3 bg-white border-b border-slate-200 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[160px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên, mã, email..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
            </div>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-100 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
              <option value="all">Tất cả phòng ban</option>
              {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-100 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
              <option value="all">Tất cả trạng thái</option>
              <option value="Active">Đang làm việc</option>
              <option value="Inactive">Đã nghỉ</option>
            </select>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                <tr className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Nhân viên</th>
                  <th className="text-left px-3 py-3">Phòng ban</th>
                  <th className="text-left px-3 py-3">Chức vụ</th>
                  <th className="text-left px-3 py-3">Hợp đồng</th>
                  <th className="text-right px-3 py-3">Lương CB</th>
                  <th className="text-left px-3 py-3">Trạng thái</th>
                  {auth?.role === 'ADMIN' && <th className="px-3 py-3 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedEmployees.map(emp => (
                  <tr key={emp.employee_id} onClick={() => setSelected(emp)}
                    className={`cursor-pointer transition-colors group ${selected?.employee_id === emp.employee_id ? 'bg-[#bde619]/10' : 'hover:bg-slate-50'}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(emp.full_name)}`}>
                          {getInitials(emp.full_name)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{emp.full_name}</p>
                          <p className="text-[11px] text-slate-400">{emp.employee_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">{emp.department_name}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{emp.position_name}</td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getContractTypeColor(emp.contract_type)}`}>{emp.contract_type}</span>
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-semibold text-slate-700">{formatCurrency(emp.base_salary)}</td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(emp.status)}`}>
                        {emp.status === 'Active' ? '● Đang làm việc' : '○ Đã nghỉ'}
                      </span>
                    </td>
                    {auth?.role === 'ADMIN' && (
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); openEdit(emp) }} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors" title="Chỉnh sửa">
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDeleteTarget(emp) }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Xóa">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl">search_off</span>
                <p className="mt-2 text-sm">Không tìm thấy nhân viên</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-5 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>Hiển thị <strong>{filtered.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</strong> trong số <strong>{filtered.length}</strong> kết quả (Tổng: {employees.length})</span>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <span className="px-2 font-medium">Trang {currentPage} / {totalPages}</span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            )}

            <button onClick={() => exportEmployees(filtered)} className="flex items-center gap-1.5 font-semibold hover:text-slate-700 transition-colors">
              <span className="material-symbols-outlined text-[14px]">download</span>Xuất Excel ({filtered.length})
            </button>
          </div>
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-[300px] shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Hồ sơ nhân viên</h3>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <span className="material-symbols-outlined text-[16px] text-slate-400">close</span>
              </button>
            </div>
            <div className="p-5">
              <div className="flex flex-col items-center gap-3 mb-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${getAvatarColor(selected.full_name)}`}>
                  {getInitials(selected.full_name)}
                </div>
                <div className="text-center">
                  <h4 className="font-bold text-slate-900">{selected.full_name}</h4>
                  <p className="text-xs text-slate-500">{selected.employee_code} · {selected.position_name}</p>
                </div>
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${getStatusColor(selected.status)}`}>
                  {selected.status === 'Active' ? 'Đang làm việc' : 'Đã nghỉ'}
                </span>
              </div>
              <div className="space-y-3">
                {[
                  { icon: 'person', label: 'Giới tính', value: selected.gender },
                  { icon: 'cake', label: 'Ngày sinh', value: formatDate(selected.dob) },
                  { icon: 'phone', label: 'Điện thoại', value: selected.phone },
                  { icon: 'email', label: 'Email', value: selected.email },
                  { icon: 'corporate_fare', label: 'Phòng ban', value: selected.department_name ?? '—' },
                  { icon: 'event', label: 'Ngày vào', value: formatDate(selected.join_date) },
                  { icon: 'description', label: 'Loại HĐ', value: selected.contract_type },
                  { icon: 'payments', label: 'Lương CB', value: formatCurrency(selected.base_salary) },
                  { icon: 'account_balance', label: 'STK', value: selected.bank_account_no || '—' },
                ].map(fi => (
                  <div key={fi.label} className="flex gap-3">
                    <span className="material-symbols-outlined text-slate-400 text-[16px] shrink-0 mt-0.5">{fi.icon}</span>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{fi.label}</p>
                      <p className="text-xs font-medium text-slate-800">{fi.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              {auth?.role === 'ADMIN' && (
                <div className="mt-5 flex gap-2">
                  <button onClick={() => openEdit(selected)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-2 rounded-xl border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors">
                    <span className="material-symbols-outlined text-[14px]">edit</span>Chỉnh sửa
                  </button>
                  <button onClick={() => setDeleteTarget(selected)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                    <span className="material-symbols-outlined text-[14px]">delete</span>Xóa
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editTarget ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}
        subtitle={editTarget ? `Mã: ${editTarget.employee_code}` : 'Điền đầy đủ thông tin nhân viên'}
        size="xl">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Họ và tên *</label>
            <input type="text" value={f.full_name} placeholder="Nguyễn Văn A"
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Giới tính</label>
            <div className="flex gap-2">
              {GENDERS.map(g => (
                <button key={g} type="button" onClick={() => setForm(p => ({ ...p, gender: g }))}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${f.gender === g ? 'border-[#bde619] bg-[#bde619]/20 text-slate-900' : 'border-slate-200 text-slate-500'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ngày sinh</label>
            <input type="date" value={f.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Số điện thoại</label>
            <input type="tel" value={f.phone} placeholder="0901234567"
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
            <input type="email" value={f.email} placeholder="ten@company.vn"
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phòng ban *</label>
            <select value={f.department_id} onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
              {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Chức vụ *</label>
            <select value={f.position_id} onChange={e => setForm(p => ({ ...p, position_id: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
              {positions.map(p => <option key={p.position_id} value={p.position_id}>{p.position_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ngày vào làm</label>
            <input type="date" value={f.join_date} onChange={e => setForm(p => ({ ...p, join_date: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Loại hợp đồng</label>
            <div className="flex gap-2 flex-wrap">
              {CONTRACT_TYPES.map(c => (
                <button key={c} type="button" onClick={() => setForm(p => ({ ...p, contract_type: c }))}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${f.contract_type === c ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lương cơ bản (VNĐ)</label>
            <input type="number" step="500000" min="0" value={f.base_salary}
              onChange={e => setForm(p => ({ ...p, base_salary: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Số tài khoản ngân hàng</label>
            <input type="text" value={f.bank_account_no} placeholder="0101000000000"
              onChange={e => setForm(p => ({ ...p, bank_account_no: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Địa chỉ</label>
            <input type="text" value={f.address} placeholder="Số nhà, đường, quận, TP..."
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Trạng thái</label>
            <div className="flex gap-3">
              {(['Active', 'Inactive'] as Status[]).map(s => (
                <button key={s} type="button" onClick={() => setForm(p => ({ ...p, status: s }))}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${f.status === s
                    ? s === 'Active' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-red-300 bg-red-50 text-red-700'
                    : 'border-slate-200 text-slate-500'}`}>
                  {s === 'Active' ? '● Đang làm việc' : '○ Đã nghỉ'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-5 border-t border-slate-100">
          <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">Hủy bỏ</button>
          <button onClick={handleSave} disabled={!f.full_name.trim() || saving}
            className="flex-1 py-2.5 text-sm font-bold rounded-xl text-slate-900 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#bde619' }}>
            {saving ? 'Đang lưu…' : editTarget ? 'Cập nhật' : 'Thêm nhân viên'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget) }}
        title="Xóa nhân viên?"
        message={`Bạn có chắc muốn xóa nhân viên ${deleteTarget?.full_name} (${deleteTarget?.employee_code})? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa nhân viên"
        danger
      />
    </div>
  )
}
