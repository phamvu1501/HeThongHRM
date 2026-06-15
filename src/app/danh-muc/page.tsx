'use client'
import { useState, useEffect } from 'react'
import { fetchData, saveDepartments, savePositions, saveShifts, logActivity } from '@/lib/store'
import { TopBar } from '@/components/TopBar'
import { Modal } from '@/components/Modal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Department, Position, Shift, Status, Employee } from '@/lib/types'

type Tab = 'Phòng ban' | 'Chức vụ' | 'Ca làm việc'

// ── helpers ─────────────────────────────────────────────────────────────────
function genDeptId(list: Department[]) {
  const nums = list.map(d => parseInt(d.department_id.replace('D', '') || '0'))
  return `D${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`
}
function genPosId(list: Position[]) {
  const nums = list.map(p => parseInt(p.position_id.replace('P', '') || '0'))
  return `P${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`
}
function genShiftId(list: Shift[]) {
  const nums = list.map(s => parseInt(s.shift_id.replace('SH', '') || '0'))
  return `SH${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`
}

const LEVELS = ['Director', 'Manager', 'Senior', 'Staff', 'Junior', 'Intern'] as const

export default function DanhMucPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Phòng ban')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: Tab } | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // ── DEPARTMENTS ──────────────────────────────────────────────────────────
  const [depts, setDepts] = useState<Department[]>([])
  const [deptEdit, setDeptEdit] = useState<Department | null>(null)
  const [deptForm, setDeptForm] = useState({ department_name: '', cost_center: '', manager_emp_id: '', status: 'Active' as Status })
  const [employees, setEmployees] = useState<Employee[]>([])
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null)

  // ── POSITIONS ────────────────────────────────────────────────────────────
  const [positions, setPositions] = useState<Position[]>([])
  const [posEdit, setPosEdit] = useState<Position | null>(null)
  const [posForm, setPosForm] = useState({ position_name: '', level: 'Staff' as Position['level'], salary_band_min: 10000000, salary_band_max: 20000000, status: 'Active' as Status })

  // ── SHIFTS ───────────────────────────────────────────────────────────────
  const [shifts, setShifts] = useState<Shift[]>([])
  const [shiftEdit, setShiftEdit] = useState<Shift | null>(null)
  const [shiftForm, setShiftForm] = useState({ shift_name: '', start_time: '08:00', end_time: '17:30', break_min: 60, work_hours: 8.5, status: 'Active' as Status })

  // Load Data
  useEffect(() => {
    fetchData().then(res => {
      setDepts(res.departments || [])
      setPositions(res.positions || [])
      setShifts(res.shifts || [])
      setEmployees(res.employees || [])
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setErrorMsg('Lỗi khi tải dữ liệu từ Excel.')
      setLoading(false)
    })
  }, [])

  // ── ACTIONS: DEPT ────────────────────────────────────────────────────────
  function openAddDept() {
    setDeptEdit(null)
    setDeptForm({ department_name: '', cost_center: '', manager_emp_id: '', status: 'Active' })
    setActiveTab('Phòng ban'); setModalOpen(true)
  }
  function openEditDept(d: Department) {
    setDeptEdit(d)
    setDeptForm({ department_name: d.department_name, cost_center: d.cost_center, manager_emp_id: d.manager_emp_id, status: d.status })
    setModalOpen(true)
  }
  async function saveDept() {
    if (!deptForm.department_name.trim()) return alert('Vui lòng nhập tên phòng ban')
    setSaving(true)
    setErrorMsg('')
    try {
      let newData
      let id = ''
      let actionName = ''
      if (deptEdit) {
        newData = depts.map(d => d.department_id === deptEdit.department_id ? { ...d, ...deptForm } : d)
        id = deptEdit.department_id
        actionName = 'UPDATE'
      } else {
        id = genDeptId(depts)
        const newD = { ...deptForm, department_id: id, created_at: new Date().toISOString().slice(0, 10) }
        newData = [...depts, newD]
        actionName = 'CREATE'
      }
      await saveDepartments(newData)
      setDepts(newData)
      setModalOpen(false)
      logActivity(actionName as any, 'phong-ban', id, `${actionName === 'CREATE' ? 'Tạo' : 'Cập nhật'} phòng ban: ${deptForm.department_name}`)
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── ACTIONS: POS ────────────────────────────────────────────────────────
  function openAddPos() {
    setPosEdit(null)
    setPosForm({ position_name: '', level: 'Staff', salary_band_min: 10000000, salary_band_max: 20000000, status: 'Active' })
    setActiveTab('Chức vụ'); setModalOpen(true)
  }
  function openEditPos(p: Position) {
    setPosEdit(p)
    setPosForm({ position_name: p.position_name, level: p.level, salary_band_min: p.salary_band_min, salary_band_max: p.salary_band_max, status: p.status })
    setModalOpen(true)
  }
  async function savePos() {
    if (!posForm.position_name.trim()) return alert('Vui lòng nhập tên chức vụ')
    setSaving(true)
    setErrorMsg('')
    try {
      let newData
      let id = ''
      let actionName = ''
      if (posEdit) {
        newData = positions.map(p => p.position_id === posEdit.position_id ? { ...p, ...posForm } : p)
        id = posEdit.position_id
        actionName = 'UPDATE'
      } else {
        id = genPosId(positions)
        newData = [...positions, { ...posForm, position_id: id }]
        actionName = 'CREATE'
      }
      await savePositions(newData)
      setPositions(newData)
      setModalOpen(false)
      logActivity(actionName as any, 'chuc-vu', id, `${actionName === 'CREATE' ? 'Tạo' : 'Cập nhật'} chức vụ: ${posForm.position_name} (${posForm.level})`)
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── ACTIONS: SHIFTS ────────────────────────────────────────────────────────
  function openAddShift() {
    setShiftEdit(null)
    setShiftForm({ shift_name: '', start_time: '08:00', end_time: '17:30', break_min: 60, work_hours: 8.5, status: 'Active' })
    setActiveTab('Ca làm việc'); setModalOpen(true)
  }
  function openEditShift(s: Shift) {
    setShiftEdit(s)
    setShiftForm({ shift_name: s.shift_name, start_time: s.start_time, end_time: s.end_time, break_min: s.break_min, work_hours: s.work_hours, status: s.status })
    setModalOpen(true)
  }
  async function saveShift() {
    if (!shiftForm.shift_name.trim()) return alert('Vui lòng nhập tên ca')
    setSaving(true)
    setErrorMsg('')
    try {
      let newData
      let id = ''
      let actionName = ''
      if (shiftEdit) {
        newData = shifts.map(s => s.shift_id === shiftEdit.shift_id ? { ...s, ...shiftForm } : s)
        id = shiftEdit.shift_id
        actionName = 'UPDATE'
      } else {
        id = genShiftId(shifts)
        newData = [...shifts, { ...shiftForm, shift_id: id }]
        actionName = 'CREATE'
      }
      await saveShifts(newData)
      setShifts(newData)
      setModalOpen(false)
      logActivity(actionName as any, 'ca-lam-viec', id, `${actionName === 'CREATE' ? 'Tạo' : 'Cập nhật'} ca làm việc: ${shiftForm.shift_name}`)
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    setErrorMsg('')
    try {
      if (deleteTarget.type === 'Phòng ban') {
        const newData = depts.filter(d => d.department_id !== deleteTarget.id)
        await saveDepartments(newData)
        setDepts(newData)
        logActivity('DELETE', 'phong-ban', deleteTarget.id, `Xóa phòng ban: ${deleteTarget.name}`)
      } else if (deleteTarget.type === 'Chức vụ') {
        const newData = positions.filter(p => p.position_id !== deleteTarget.id)
        await savePositions(newData)
        setPositions(newData)
        logActivity('DELETE', 'chuc-vu', deleteTarget.id, `Xóa chức vụ: ${deleteTarget.name}`)
      } else if (deleteTarget.type === 'Ca làm việc') {
        const newData = shifts.filter(s => s.shift_id !== deleteTarget.id)
        await saveShifts(newData)
        setShifts(newData)
        logActivity('DELETE', 'ca-lam-viec', deleteTarget.id, `Xóa ca làm việc: ${deleteTarget.name}`)
      }
      setDeleteTarget(null)
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── RENDER HELPERS ──────────────────────────────────────────────────────────
  function getAddButtonLabel() {
    if (activeTab === 'Phòng ban') return 'Thêm phòng ban'
    if (activeTab === 'Chức vụ') return 'Thêm chức vụ'
    if (activeTab === 'Ca làm việc') return 'Thêm ca làm'
    return 'Thêm mới'
  }

  function handleAdd() {
    if (activeTab === 'Phòng ban') openAddDept()
    else if (activeTab === 'Chức vụ') openAddPos()
    else if (activeTab === 'Ca làm việc') openAddShift()
  }

  function getModalTitle() {
    if (activeTab === 'Phòng ban') return deptEdit ? 'Chỉnh sửa phòng ban' : 'Thêm phòng ban mới'
    if (activeTab === 'Chức vụ') return posEdit ? 'Chỉnh sửa chức vụ' : 'Thêm chức vụ mới'
    return shiftEdit ? 'Chỉnh sửa ca làm việc' : 'Thêm ca làm việc mới'
  }

  function handleSave() {
    if (activeTab === 'Phòng ban') saveDept()
    else if (activeTab === 'Chức vụ') savePos()
    else if (activeTab === 'Ca làm việc') saveShift()
  }

  if (loading) {
     return (
        <div className="flex flex-col h-full overflow-hidden">
           <TopBar title="Danh mục hệ thống" subtitle="Khởi tạo dữ liệu..." />
           <div className="flex-1 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">sync</span>
           </div>
        </div>
     )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Danh mục hệ thống"
        subtitle="Quản lý phòng ban, chức vụ và ca làm việc"
        actions={
          <button onClick={handleAdd} disabled={saving}
            className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl text-slate-900 hover:opacity-90 transition-all disabled:opacity-50"
            style={{ background: '#bde619' }}>
            <span className="material-symbols-outlined text-[16px]">add</span>
            {getAddButtonLabel()}
          </button>
        }
      />

      {errorMsg && (
        <div className="mx-5 mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="shrink-0 px-5 border-b border-slate-200 bg-white flex gap-1 mt-4">
        {(['Phòng ban', 'Chức vụ', 'Ca làm việc'] as Tab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === tab ? 'border-[#bde619] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* ── PHÒNG BAN ─────────────────────────────────────────────────────── */}
        {activeTab === 'Phòng ban' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {depts.map(d => {
              const deptEmps = employees.filter(e => e.department_id === d.department_id)
              const isExpanded = expandedDeptId === d.department_id
              return (
              <div key={d.department_id}
                onClick={() => setExpandedDeptId(isExpanded ? null : d.department_id)}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow group cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#bde619' }}>
                    <span className="material-symbols-outlined text-[20px] text-slate-900">corporate_fare</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {d.status === 'Active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">{d.department_name}</h3>
                <p className="text-xs text-slate-500">Cost Center: <span className="font-semibold text-slate-700">{d.cost_center}</span></p>
                
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 animate-fade-up" onClick={e => e.stopPropagation()}>
                    <h4 className="text-xs font-bold text-slate-900 mb-2">Nhân sự ({deptEmps.length})</h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {deptEmps.map(emp => (
                        <div key={emp.employee_id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700 shrink-0">
                            {emp.full_name.split(' ').pop()?.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">{emp.full_name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{positions.find(p => p.position_id === emp.position_id)?.position_name || 'Chưa cập nhật chức vụ'}</p>
                          </div>
                        </div>
                      ))}
                      {deptEmps.length === 0 && <p className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-lg text-center">Chưa có nhân viên nào.</p>}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 flex gap-3" onClick={e => e.stopPropagation()}>
                  <span className="text-[10px] text-slate-400 flex-1">{d.department_id}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditDept(d)} disabled={saving}
                      className="text-xs font-semibold text-blue-600 hover:underline">Chỉnh sửa</button>
                    <span className="text-slate-300">·</span>
                    <button onClick={() => setDeleteTarget({ id: d.department_id, name: d.department_name, type: 'Phòng ban' })} disabled={saving}
                      className="text-xs font-semibold text-red-500 hover:underline">Xóa</button>
                  </div>
                </div>
              </div>
            )})}
            {depts.length === 0 && (
                <div className="col-span-full text-center p-8 text-slate-500 text-sm">Chưa có dữ liệu phòng ban.</div>
            )}
          </div>
        )}

        {/* ── CHỨC VỤ ─────────────────────────────────────────────────────── */}
        {activeTab === 'Chức vụ' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Chức vụ</th>
                  <th className="text-left px-3 py-3">Cấp bậc</th>
                  <th className="text-right px-3 py-3">Lương min</th>
                  <th className="text-right px-3 py-3">Lương max</th>
                  <th className="text-center px-3 py-3">Trạng thái</th>
                  <th className="px-3 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {positions.map(p => (
                  <tr key={p.position_id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-5 py-3 font-semibold text-slate-900">{p.position_name}</td>
                    <td className="px-3 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{p.level}</span>
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-slate-600">
                      {(p.salary_band_min / 1e6).toFixed(0)}M
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-slate-600">
                      {(p.salary_band_max / 1e6).toFixed(0)}M
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button disabled={saving} onClick={() => openEditPos(p)} className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50">Sửa</button>
                        <button disabled={saving} onClick={() => setDeleteTarget({ id: p.position_id, name: p.position_name, type: 'Chức vụ' })} className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50">Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {positions.length === 0 && (
                   <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500 text-sm">Chưa có dữ liệu chức vụ.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── CA LÀM VIỆC ─────────────────────────────────────────────────── */}
        {activeTab === 'Ca làm việc' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map(s => (
              <div key={s.shift_id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100">
                    <span className="material-symbols-outlined text-[20px] text-blue-600">schedule</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {s.status}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{s.shift_name}</h3>
                <p className="text-lg font-black text-slate-800 mt-1">{s.start_time} – {s.end_time}</p>
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  <span>Nghỉ: <strong>{s.break_min}ph</strong></span>
                  <span>Giờ làm: <strong>{s.work_hours}h</strong></span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">{s.shift_id}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button disabled={saving} onClick={() => openEditShift(s)} className="text-xs font-semibold text-blue-600 hover:underline">Sửa</button>
                    <button disabled={saving} onClick={() => setDeleteTarget({ id: s.shift_id, name: s.shift_name, type: 'Ca làm việc' })} className="text-xs font-semibold text-red-500 hover:underline">Xóa</button>
                  </div>
                </div>
              </div>
            ))}
             {shifts.length === 0 && (
               <div className="col-span-full text-center p-8 text-slate-500 text-sm">Chưa có dữ liệu ca làm việc.</div>
             )}
          </div>
        )}

        {/* ── BẢNG GIÁ TRỊ REMOVED ────────────────────────────────────────── */}
      </div>

      {/* ── MODAL ─────────────────────────────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => { if(!saving) setModalOpen(false) }} title={getModalTitle()} size="md">
        {/* DEPT FORM */}
        {activeTab === 'Phòng ban' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tên phòng ban *</label>
              <input type="text" value={deptForm.department_name} placeholder="Kỹ thuật - Phần mềm"
                disabled={saving}
                onChange={e => setDeptForm(p => ({ ...p, department_name: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 disabled:opacity-60" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cost Center</label>
              <input type="text" value={deptForm.cost_center} placeholder="CC-IT"
                disabled={saving}
                onChange={e => setDeptForm(p => ({ ...p, cost_center: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 disabled:opacity-60" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Trạng thái</label>
              <div className="flex gap-3">
                {(['Active', 'Inactive'] as Status[]).map(s => (
                  <button key={s} type="button" onClick={() => !saving && setDeptForm(p => ({ ...p, status: s }))}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${deptForm.status === s
                      ? s === 'Active' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-400 bg-slate-100 text-slate-700'
                      : 'border-slate-200 text-slate-500'} ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* POS FORM */}
        {activeTab === 'Chức vụ' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tên chức vụ *</label>
              <input type="text" value={posForm.position_name} placeholder="Kỹ sư cao cấp"
                disabled={saving}
                onChange={e => setPosForm(p => ({ ...p, position_name: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 disabled:opacity-60" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cấp bậc</label>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map(l => (
                  <button key={l} type="button" onClick={() => !saving && setPosForm(p => ({ ...p, level: l }))}
                    className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${posForm.level === l ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'} ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lương tối thiểu</label>
                <input type="number" step="1000000" value={posForm.salary_band_min}
                  disabled={saving}
                  onChange={e => setPosForm(p => ({ ...p, salary_band_min: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 disabled:opacity-60" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lương tối đa</label>
                <input type="number" step="1000000" value={posForm.salary_band_max}
                  disabled={saving}
                  onChange={e => setPosForm(p => ({ ...p, salary_band_max: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 disabled:opacity-60" />
              </div>
            </div>
            <div>
               <label className="block text-xs font-semibold text-slate-700 mb-1.5">Trạng thái</label>
               <div className="flex gap-3">
               {(['Active', 'Inactive'] as Status[]).map(s => (
                  <button key={s} type="button" onClick={() => !saving && setPosForm(p => ({ ...p, status: s }))}
                     className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${posForm.status === s
                     ? s === 'Active' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-400 bg-slate-100 text-slate-700'
                     : 'border-slate-200 text-slate-500'} ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                     {s}
                  </button>
               ))}
               </div>
            </div>
          </div>
        )}

        {/* SHIFT FORM */}
        {activeTab === 'Ca làm việc' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tên ca *</label>
              <input type="text" value={shiftForm.shift_name} placeholder="Ca hành chính"
                disabled={saving}
                onChange={e => setShiftForm(p => ({ ...p, shift_name: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 disabled:opacity-60" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Giờ bắt đầu</label>
                <input type="time" value={shiftForm.start_time}
                  disabled={saving}
                  onChange={e => setShiftForm(p => ({ ...p, start_time: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 disabled:opacity-60" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Giờ kết thúc</label>
                <input type="time" value={shiftForm.end_time}
                  disabled={saving}
                  onChange={e => setShiftForm(p => ({ ...p, end_time: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 disabled:opacity-60" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nghỉ giữa ca (phút)</label>
                <input type="number" step="15" min="0" max="120" value={shiftForm.break_min}
                  disabled={saving}
                  onChange={e => setShiftForm(p => ({ ...p, break_min: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 disabled:opacity-60" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Số giờ làm</label>
                <input type="number" step="0.5" min="0" max="12" value={shiftForm.work_hours}
                  disabled={saving}
                  onChange={e => setShiftForm(p => ({ ...p, work_hours: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 disabled:opacity-60" />
              </div>
            </div>
            <div>
               <label className="block text-xs font-semibold text-slate-700 mb-1.5">Trạng thái</label>
               <div className="flex gap-3">
               {(['Active', 'Inactive'] as Status[]).map(s => (
                  <button key={s} type="button" onClick={() => !saving && setShiftForm(p => ({ ...p, status: s }))}
                     className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${shiftForm.status === s
                     ? s === 'Active' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-400 bg-slate-100 text-slate-700'
                     : 'border-slate-200 text-slate-500'} ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                     {s}
                  </button>
               ))}
               </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6 pt-5 border-t border-slate-100">
          <button onClick={() => !saving && setModalOpen(false)} disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50">
            Hủy bỏ
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 text-sm font-bold rounded-xl text-slate-900 hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#bde619' }}>
            {saving && <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>}
            {(activeTab === 'Phòng ban' && deptEdit) || (activeTab === 'Chức vụ' && posEdit) || (activeTab === 'Ca làm việc' && shiftEdit) ? 'Cập nhật' : 'Thêm mới'}
          </button>
        </div>
      </Modal>

      {/* CONFIRM DELETE */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => !saving && setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) handleDelete() }}
        title={`Xóa ${deleteTarget?.type}?`}
        message={`Bạn có chắc chắn muốn xóa "${deleteTarget?.name}"?`}
        confirmLabel={saving ? "Đang xóa..." : "Xóa"}
        danger
      />
    </div>
  )
}
