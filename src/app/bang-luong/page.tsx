'use client'
import { useState, useMemo, useEffect } from 'react'
import { fetchData, savePayrolls, logActivity } from '@/lib/store'
import { formatCurrency, getPayrollStatusColor, getMonthDisplay } from '@/lib/utils'
import { TopBar } from '@/components/TopBar'
import { exportPayrolls } from '@/lib/excel'
import { getAuth, AuthUser } from '@/lib/auth'
import type { Payroll, PayrollStatus } from '@/lib/types'

export default function BangLuongPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [monthFilter, setMonthFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState<Payroll | null>(null)
  const [auth, setAuth] = useState<AuthUser | null>(null)

  useEffect(() => {
    setLoading(true)
    const authData = getAuth()
    setAuth(authData)

    fetchData().then(data => {
      let filteredPayrolls = data.payrolls
      if (authData?.role === 'EMPLOYEE' && authData.empId) {
        filteredPayrolls = data.payrolls.filter(p => p.employee_id === authData.empId)
      }
      setPayrolls(filteredPayrolls)
      const months = [...new Set(filteredPayrolls.map(p => p.month))].sort().reverse()
      setMonthFilter(months[0] ?? '')
      setLoading(false)
    }).catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const months = useMemo(() => [...new Set(payrolls.map(p => p.month))].sort().reverse(), [payrolls])

  const filtered = useMemo(() => {
    return payrolls.filter(p => {
      const matchMonth = !monthFilter || p.month === monthFilter
      const matchStatus = statusFilter === 'all' || p.status === statusFilter
      const matchSearch = !searchQuery || p.employee_name?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchMonth && matchStatus && matchSearch
    }).sort((a, b) => (a.employee_name ?? '').localeCompare(b.employee_name ?? ''))
  }, [payrolls, monthFilter, statusFilter, searchQuery])

  const totalGross = filtered.reduce((s, p) => s + p.gross_pay, 0)
  const totalNet = filtered.reduce((s, p) => s + p.net_pay, 0)
  const totalInsurance = filtered.reduce((s, p) => s + p.insurance, 0)
  const totalPIT = filtered.reduce((s, p) => s + p.pit, 0)

  async function handleMarkPaid(payroll: Payroll) {
    const updated = { ...payroll, status: 'Đã thanh toán' as PayrollStatus }
    const next = payrolls.map(p => p.payroll_id === payroll.payroll_id ? updated : p)
    setSaving(true)
    try {
      await savePayrolls(next)
      setPayrolls(next)
      if (selected?.payroll_id === payroll.payroll_id) setSelected(updated)
      logActivity('APPROVE', 'bang-luong', payroll.payroll_id, `Thanh toán lương tháng ${payroll.month} cho ${payroll.employee_name}`)
    } catch (err: any) { alert('Lỗi: ' + err.message) }
    finally { setSaving(false) }
  }

  async function handleMarkAllPaid() {
    const next = payrolls.map(p =>
      p.month === monthFilter && p.status !== 'Đã thanh toán'
        ? { ...p, status: 'Đã thanh toán' as PayrollStatus }
        : p
    )
    setSaving(true)
    try {
      await savePayrolls(next)
      setPayrolls(next)
      setSelected(null)
      logActivity('APPROVE', 'bang-luong', 'ALL', `Thanh toán tất cả lương tháng ${monthFilter}`)
    } catch (err: any) { alert('Lỗi: ' + err.message) }
    finally { setSaving(false) }
  }

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
        title="Bảng lương"
        subtitle={`Kỳ: ${monthFilter ? getMonthDisplay(monthFilter) : '—'} · ${filtered.length} nhân viên`}
        actions={
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>Đang lưu…
            </span>}
            {auth?.role === 'ADMIN' && filtered.some(p => p.status !== 'Đã thanh toán') && (
              <button onClick={handleMarkAllPaid}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors">
                <span className="material-symbols-outlined text-[16px]">payments</span>
                Duyệt thanh toán ({filtered.filter(p => p.status !== 'Đã thanh toán').length})
              </button>
            )}
            <button onClick={() => exportPayrolls(filtered)}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
              <span className="material-symbols-outlined text-[16px]">download</span>Xuất Excel
            </button>
          </div>
        }
      />

      {/* Summary */}
      <div className="shrink-0 px-5 py-3 bg-white border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng Gross', val: formatCurrency(totalGross), color: 'text-slate-900' },
          { label: 'Tổng Net', val: formatCurrency(totalNet), color: 'text-emerald-700' },
          { label: 'Bảo hiểm (NV)', val: formatCurrency(totalInsurance), color: 'text-red-600' },
          { label: 'Thuế PIT', val: formatCurrency(totalPIT), color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-sm font-black mt-0.5 ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="shrink-0 px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
          <input 
            type="text" 
            placeholder="Tìm kiếm nhân viên..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50"
          />
        </div>
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
          {months.map(m => <option key={m} value={m}>{getMonthDisplay(m || '')}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer">
          <option value="all">Tất cả trạng thái</option>
          <option value="Chưa thanh toán">Chưa thanh toán</option>
          <option value="Đang xử lý">Đang xử lý</option>
          <option value="Đã thanh toán">Đã thanh toán</option>
        </select>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
              <tr className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="text-left px-5 py-3">Nhân viên</th>
                <th className="text-left px-3 py-3">Phòng ban</th>
                <th className="text-right px-3 py-3">Lương CB</th>
                <th className="text-right px-3 py-3">Phụ cấp</th>
                <th className="text-right px-3 py-3">OT</th>
                <th className="text-right px-3 py-3">Gross</th>
                <th className="text-right px-3 py-3">BH/Thuế</th>
                <th className="text-right px-5 py-3 font-black text-slate-800">Net</th>
                <th className="text-left px-3 py-3">Trạng thái</th>
                {auth?.role === 'ADMIN' && <th className="px-3 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => (
                <tr key={p.payroll_id} onClick={() => setSelected(p)}
                  className={`cursor-pointer transition-colors group ${selected?.payroll_id === p.payroll_id ? 'bg-[#bde619]/10' : 'hover:bg-slate-50'}`}>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-900">{p.employee_name}</p>
                    <p className="text-[10px] text-slate-400">{p.payroll_id}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600">{p.department_name}</td>
                  <td className="px-3 py-3 text-right text-xs font-mono text-slate-700">{formatCurrency(p.base_salary)}</td>
                  <td className="px-3 py-3 text-right text-xs font-mono text-emerald-600">
                    {p.allowance > 0 ? `+${formatCurrency(p.allowance)}` : '—'}
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-mono text-[#7c5f00]">
                    {p.overtime_pay > 0 ? `+${formatCurrency(p.overtime_pay)}` : '—'}
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-mono text-slate-700">{formatCurrency(p.gross_pay)}</td>
                  <td className="px-3 py-3 text-right text-xs font-mono text-red-600">
                    -{formatCurrency(p.insurance + p.pit)}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-black text-slate-900">{formatCurrency(p.net_pay)}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPayrollStatusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  {auth?.role === 'ADMIN' && (
                    <td className="px-3 py-3">
                      {p.status !== 'Đã thanh toán' && (
                        <button
                          onClick={e => { e.stopPropagation(); handleMarkPaid(p) }}
                          className="opacity-0 group-hover:opacity-100 text-[10px] font-bold px-2 py-1 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all">
                          Duyệt
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl">payments</span>
              <p className="mt-2 text-sm">Không có dữ liệu bảng lương</p>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-[300px] shrink-0 bg-white border-l border-slate-200 overflow-y-auto animate-fade-up">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-sm">Chi tiết lương</h3>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <span className="material-symbols-outlined text-[16px] text-slate-400">close</span>
              </button>
            </div>
            <div className="p-5 space-y-1">
              <div className="mb-4">
                <h4 className="font-bold text-slate-900">{selected.employee_name}</h4>
                <p className="text-xs text-slate-500">{selected.department_name} · {getMonthDisplay(selected.month || '')}</p>
              </div>

              {[
                { label: 'Lương cơ bản', val: selected.base_salary, color: 'text-slate-700' },
                { label: `Công thực tế (${selected.work_days_actual}/${selected.work_days_standard} ngày)`, val: selected.work_days_standard > 0 ? Math.round(selected.base_salary * selected.work_days_actual / selected.work_days_standard) : 0, color: 'text-slate-700' },
                { label: `Tăng ca (${selected.overtime_hours}h)`, val: selected.overtime_pay, color: 'text-[#7c5f00]' },
                { label: 'Phụ cấp', val: selected.allowance, color: 'text-emerald-600' },
                { label: 'Khấu trừ', val: -selected.deduction, color: 'text-red-600' },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-xs py-1.5 border-b border-slate-50">
                  <span className="text-slate-600">{r.label}</span>
                  <span className={`font-semibold ${r.color}`}>
                    {r.val !== 0 ? formatCurrency(Math.abs(r.val)) : '—'}
                  </span>
                </div>
              ))}

              <div className="flex justify-between text-sm font-bold py-2 border-b border-slate-200">
                <span className="text-slate-900">Lương Gross</span>
                <span className="text-slate-900">{formatCurrency(selected.gross_pay)}</span>
              </div>

              {[
                { label: 'BHXH + BHYT + BHTN', val: -selected.insurance, color: 'text-red-600' },
                { label: 'Thuế PIT', val: -selected.pit, color: 'text-red-600' },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-xs py-1.5 border-b border-slate-50">
                  <span className="text-slate-600">{r.label}</span>
                  <span className={`font-semibold ${r.color}`}>{formatCurrency(Math.abs(r.val))}</span>
                </div>
              ))}

              <div className="flex justify-between text-base font-black py-3">
                <span className="text-slate-900">Lương Net</span>
                <span style={{ color: '#5c8a00' }}>{formatCurrency(selected.net_pay)}</span>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Ngày thanh toán</span>
                  <span className="font-medium text-slate-700">{selected.pay_date || '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Trạng thái</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPayrollStatusColor(selected.status)}`}>
                    {selected.status}
                  </span>
                </div>
              </div>

              {auth?.role === 'ADMIN' && selected.status !== 'Đã thanh toán' && (
                <button onClick={() => handleMarkPaid(selected)} disabled={saving}
                  className="w-full mt-4 text-sm font-bold py-2.5 rounded-xl text-slate-900 hover:opacity-90 transition-all disabled:opacity-50"
                  style={{ background: '#bde619' }}>
                  {saving ? 'Đang lưu…' : '✓ Duyệt thanh toán'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
