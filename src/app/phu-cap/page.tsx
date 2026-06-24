'use client'
import { useState, useMemo, useEffect } from 'react'
import { fetchData, saveAdjustments, logActivity } from '@/lib/store'
import { exportAdjustments } from '@/lib/excel'
import { formatCurrency, formatDate, getMonthDisplay } from '@/lib/utils'
import { TopBar } from '@/components/TopBar'
import { Modal } from '@/components/Modal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Adjustment, AdjType, Employee } from '@/lib/types'

const ADJ_TYPES: { type: AdjType; isPositive: boolean }[] = [
  { type: 'Phụ cấp ăn trưa', isPositive: true },
  { type: 'Phụ cấp xăng xe', isPositive: true },
  { type: 'Phụ cấp điện thoại', isPositive: true },
  { type: 'Thưởng KPI', isPositive: true },
  { type: 'Thưởng dự án', isPositive: true },
  { type: 'Khấu trừ đi muộn', isPositive: false },
  { type: 'Khấu trừ nghỉ không phép', isPositive: false },
  { type: 'Phạt kỷ luật', isPositive: false },
]

const ADJ_BG: Record<string, string> = {
  'Phụ cấp ăn trưa': '#dcfce7', 'Thưởng KPI': '#fef3c7', 'Thưởng dự án': '#fef9c3',
  'Phụ cấp xăng xe': '#e0f2fe', 'Phụ cấp điện thoại': '#ede9fe',
  'Khấu trừ đi muộn': '#fee2e2', 'Khấu trừ nghỉ không phép': '#fee2e2', 'Phạt kỷ luật': '#fecaca',
}
const ADJ_TEXT: Record<string, string> = {
  'Phụ cấp ăn trưa': '#166534', 'Thưởng KPI': '#92400e', 'Thưởng dự án': '#713f12',
  'Phụ cấp xăng xe': '#075985', 'Phụ cấp điện thoại': '#5b21b6',
  'Khấu trừ đi muộn': '#991b1b', 'Khấu trừ nghỉ không phép': '#991b1b', 'Phạt kỷ luật': '#7f1d1d',
}

// Map adj_type from Excel (English keys) → UI Vietnamese display
const ADJ_TYPE_DISPLAY: Record<string, string> = {
  bonus: 'Thưởng KPI', allowance: 'Phụ cấp ăn trưa', deduction: 'Khấu trừ đi muộn',
  penalty: 'Phạt kỷ luật', overtime: 'Thưởng dự án',
}

function genId(list: Adjustment[]) {
  const nums = list.map(r => parseInt(r.adj_id.replace(/\D/g, '') || '0'))
  return `ADJ-${String(Math.max(0, ...nums) + 1).padStart(6, '0')}`
}

export default function PhuCapPage() {
  const [records, setRecords] = useState<Adjustment[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [empMap, setEmpMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [months, setMonths] = useState<string[]>([])

  const [monthFilter, setMonthFilter] = useState('')
  const [empFilter, setEmpFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Adjustment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Adjustment | null>(null)

  const [form, setForm] = useState({
    employee_id: '',
    month: new Date().toISOString().slice(0, 7),
    adj_type: 'Phụ cấp ăn trưa' as AdjType,
    amount: 800000,
    description: '',
  })

  useEffect(() => {
    setLoading(true)
    fetchData().then(data => {
      const activeEmps = data.employees.filter(e => e.status === 'Active')
      const map = Object.fromEntries(data.employees.map(e => [e.employee_id, e.full_name]))
      setEmployees(activeEmps)
      setEmpMap(map)

      // Normalize adj_type from Excel English → Vietnamese
      const normalized = data.adjustments.map(a => ({
        ...a,
        adj_type: (ADJ_TYPE_DISPLAY[a.adj_type] ?? a.adj_type) as AdjType,
        employee_name: map[a.employee_id] ?? a.employee_name ?? '',
      }))
      setRecords(normalized)

      const ms = [...new Set(normalized.map(a => a.month))].sort().reverse()
      setMonths(ms)
      setMonthFilter(ms[0] ?? new Date().toISOString().slice(0, 7))
      setForm(f => ({ ...f, employee_id: activeEmps[0]?.employee_id ?? '' }))
      setLoading(false)
    }).catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const filtered = useMemo(() => records.filter(a => {
    const matchMonth = !monthFilter || a.month === monthFilter
    const matchEmp = empFilter === 'all' || a.employee_id === empFilter
    return matchMonth && matchEmp
  }), [records, monthFilter, empFilter])

  const totalAllowance = filtered.filter(a => a.amount > 0).reduce((s, a) => s + a.amount, 0)
  const totalDeduction = filtered.filter(a => a.amount < 0).reduce((s, a) => s + a.amount, 0)

  function openAdd() {
    setEditTarget(null)
    setForm({
      employee_id: employees[0]?.employee_id ?? '',
      month: monthFilter || new Date().toISOString().slice(0, 7),
      adj_type: 'Phụ cấp ăn trưa',
      amount: 800000,
      description: '',
    })
    setModalOpen(true)
  }

  function openEdit(adj: Adjustment) {
    setEditTarget(adj)
    setForm({
      employee_id: adj.employee_id,
      month: adj.month,
      adj_type: adj.adj_type as AdjType,
      amount: Math.abs(adj.amount),
      description: adj.description,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    const typeInfo = ADJ_TYPES.find(t => t.type === form.adj_type)
    const finalAmount = typeInfo?.isPositive ? form.amount : -form.amount
    const record: Adjustment = {
      adj_id: editTarget?.adj_id ?? genId(records),
      month: form.month,
      employee_id: form.employee_id,
      adj_type: form.adj_type,
      amount: finalAmount,
      description: form.description,
      created_at: editTarget?.created_at ?? new Date().toISOString().slice(0, 10),
      employee_name: empMap[form.employee_id] ?? '',
    }

    let next: Adjustment[]
    if (editTarget) {
      next = records.map(r => r.adj_id === editTarget.adj_id ? record : r)
    } else {
      next = [...records, record]
    }

    setSaving(true)
    try {
      await saveAdjustments(next)
      setRecords(next)
      logActivity(
        editTarget ? 'UPDATE' : 'CREATE',
        'phu-cap-khau-tru',
        record.adj_id,
        editTarget
          ? `Cập nhật phụ cấp/KT ${record.adj_type} của ${record.employee_name}`
          : `Thêm phụ cấp/KT ${record.adj_type} cho ${record.employee_name}`
      )
      setModalOpen(false)
    } catch (err: any) { alert('Lỗi lưu: ' + err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(adj: Adjustment) {
    const next = records.filter(r => r.adj_id !== adj.adj_id)
    setSaving(true)
    try {
      await saveAdjustments(next)
      setRecords(next)
      logActivity('DELETE', 'phu-cap-khau-tru', adj.adj_id, `Xóa khoản ${adj.adj_type} của ${adj.employee_name}`)
    } catch (err: any) { alert('Lỗi xóa: ' + err.message) }
    finally { setSaving(false) }
  }

  const f = form
  const isPositiveType = ADJ_TYPES.find(t => t.type === f.adj_type)?.isPositive ?? true

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
        title="Phụ cấp & Khấu trừ"
        subtitle="Quản lý các khoản tăng/giảm lương phát sinh trong tháng"
        actions={
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>Đang lưu…
            </span>}
            <button onClick={openAdd}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl text-slate-900 hover:opacity-90 transition-all"
              style={{ background: '#bde619' }}>
              <span className="material-symbols-outlined text-[16px]">add</span>Thêm phụ cấp
            </button>
          </div>
        }
      />

      {/* Summary */}
      <div className="shrink-0 px-5 py-3 bg-white border-b border-slate-200 flex gap-6">
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Tổng phụ cấp</p>
          <p className="text-lg font-black text-emerald-600">+{formatCurrency(totalAllowance)}</p>
        </div>
        <div className="w-px bg-slate-200" />
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Tổng khấu trừ</p>
          <p className="text-lg font-black text-red-600">{formatCurrency(totalDeduction)}</p>
        </div>
        <div className="w-px bg-slate-200" />
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Chênh lệch</p>
          <p className={`text-lg font-black ${totalAllowance + totalDeduction >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(totalAllowance + totalDeduction)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="shrink-0 px-5 py-3 bg-slate-50 border-b border-slate-200 flex gap-3">
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
          {months.map(m => <option key={m} value={m}>{getMonthDisplay(m)}</option>)}
        </select>
        <select value={empFilter} onChange={e => setEmpFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
          <option value="all">Tất cả nhân viên</option>
          {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.full_name}</option>)}
        </select>
        <button onClick={() => exportAdjustments(filtered)}
          className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors">
          <span className="material-symbols-outlined text-[14px]">download</span>Xuất Excel ({filtered.length})
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(adj => (
            <div key={adj.adj_id}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: ADJ_BG[adj.adj_type] ?? '#f1f5f9', color: ADJ_TEXT[adj.adj_type] ?? '#475569' }}>
                  {adj.adj_type}
                </span>
                <span className={`text-sm font-black ${adj.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {adj.amount >= 0 ? '+' : ''}{formatCurrency(adj.amount)}
                </span>
              </div>
              <h4 className="font-semibold text-slate-900 text-sm">{adj.employee_name}</h4>
              <p className="text-xs text-slate-500 mt-1">{adj.description || '—'}</p>
              <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">{adj.adj_id} · {formatDate(adj.created_at)}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(adj)}
                    className="p-1 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                  </button>
                  <button onClick={() => setDeleteTarget(adj)}
                    className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl">add_card</span>
            <p className="mt-2 text-sm">Không có dữ liệu phụ cấp/khấu trừ</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editTarget ? 'Chỉnh sửa phụ cấp/khấu trừ' : 'Thêm phụ cấp / khấu trừ'}
        size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nhân viên *</label>
            <select value={f.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
              {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tháng *</label>
            <select value={f.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
              {Array.from(new Set([
                ...months,
                ...Array.from({ length: 12 }, (_, i) => {
                  const d = new Date();
                  return new Date(d.getFullYear(), d.getMonth() - i + 1, 1).toISOString().slice(0, 7);
                })
              ])).sort().reverse().map(m => (
                <option key={m} value={m}>{getMonthDisplay(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Loại *</label>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Phụ cấp & Thưởng</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {ADJ_TYPES.filter(t => t.isPositive).map(t => (
                  <button key={t.type} type="button" onClick={() => setForm(p => ({ ...p, adj_type: t.type }))}
                    className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${f.adj_type === t.type ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>
                    {t.type}
                  </button>
                ))}
              </div>
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Khấu trừ</p>
              <div className="flex flex-wrap gap-2">
                {ADJ_TYPES.filter(t => !t.isPositive).map(t => (
                  <button key={t.type} type="button" onClick={() => setForm(p => ({ ...p, adj_type: t.type }))}
                    className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${f.adj_type === t.type ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500'}`}>
                    {t.type}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Số tiền (VNĐ) · Sẽ được tính là {isPositiveType ? '+' : '-'}
            </label>
            <input type="number" step="50000" min="0" value={f.amount}
              onChange={e => setForm(p => ({ ...p, amount: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
            <p className={`text-xs font-bold mt-1 ${isPositiveType ? 'text-emerald-600' : 'text-red-600'}`}>
              ➜ {isPositiveType ? '+' : '-'}{formatCurrency(f.amount)}
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mô tả</label>
            <input type="text" value={f.description} placeholder="Ghi chú thêm..."
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-5 border-t border-slate-100">
          <button onClick={() => setModalOpen(false)}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
            Hủy bỏ
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 text-sm font-bold rounded-xl text-slate-900 hover:opacity-90 transition-all disabled:opacity-50"
            style={{ background: '#bde619' }}>
            {saving ? 'Đang lưu…' : editTarget ? 'Cập nhật' : 'Thêm mới'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget) }}
        title="Xóa phụ cấp?" message={`Xóa khoản "${deleteTarget?.adj_type}" của ${deleteTarget?.employee_name}?`}
        confirmLabel="Xóa" danger />
    </div>
  )
}
