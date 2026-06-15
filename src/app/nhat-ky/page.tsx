'use client'
import { useState, useMemo, useEffect } from 'react'
import { fetchData } from '@/lib/store'
import { formatDateTime } from '@/lib/utils'
import { TopBar } from '@/components/TopBar'
import type { LogAction, SystemLog } from '@/lib/types'

const ACTION_COLOR: Record<string, string> = {
  CREATE: 'text-emerald-600 bg-emerald-50',
  UPDATE: 'text-blue-600 bg-blue-50',
  DELETE: 'text-red-600 bg-red-50',
  LOGIN: 'text-slate-600 bg-slate-100',
  LOGOUT: 'text-slate-600 bg-slate-100',
  APPROVE: 'text-violet-600 bg-violet-50',
  REJECT: 'text-orange-600 bg-orange-50',
  PAY: 'text-amber-600 bg-amber-50',
}
const ACTION_ICON: Record<string, string> = {
  CREATE: 'add_circle',
  UPDATE: 'edit',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  APPROVE: 'check_circle',
  REJECT: 'cancel',
  PAY: 'payments',
}
const ACTION_VI: Record<string, string> = {
  CREATE: 'Thêm mới', create: 'Thêm mới',
  UPDATE: 'Cập nhật', update: 'Cập nhật',
  DELETE: 'Xóa', delete: 'Xóa',
  LOGIN: 'Đăng nhập', login: 'Đăng nhập',
  LOGOUT: 'Đăng xuất', logout: 'Đăng xuất',
  APPROVE: 'Phê duyệt', approve: 'Phê duyệt',
  REJECT: 'Từ chối', reject: 'Từ chối',
  PAY: 'Chốt lương', pay: 'Chốt lương',
}
const MODULE_VI: Record<string, string> = {
  'phong-ban': 'Phòng ban',
  'don-xin-nghi': 'Đơn từ',
  'cham-cong': 'Chấm công',
  'cai-dat': 'Cài đặt',
  'nhan-vien': 'Nhân viên',
  'bang-luong': 'Bảng lương',
  'phu-cap': 'Phụ cấp',
  'danh-muc': 'Danh mục',
  'nhat-ky': 'Nhật ký',
  'SYSTEM': 'Hệ thống',
  'EXPORT': 'Trích xuất'
}

export default function NhatKyPage() {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [actionFilter, setActionFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    fetchData().then(data => {
      setLogs(data.logs || [])
      setLoading(false)
    }).catch(err => {
      setError(err.message)
      setLoading(false)
    })
  }, [])

  const actions = useMemo(() => [...new Set(logs.map(l => l.action))], [logs])
  const entities = useMemo(() => [...new Set(logs.map(l => l.entity_type))], [logs])

  const filtered = useMemo(() => {
    return logs.filter(l => {
      const matchAction = actionFilter === 'all' || l.action === actionFilter
      const matchEntity = entityFilter === 'all' || l.entity_type === entityFilter
      return matchAction && matchEntity
    }).sort((a, b) => b.log_time.localeCompare(a.log_time))
  }, [logs, actionFilter, entityFilter])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">sync</span>
        <p className="mt-3 text-sm text-slate-500">Đang tải nhật ký từ Excel…</p>
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
        title="Nhật ký hệ thống"
        subtitle="Lịch sử toàn bộ thao tác thêm, sửa, xóa, duyệt trên hệ thống"
      />

      {/* Filters */}
      <div className="shrink-0 px-5 py-3 bg-white border-b border-slate-200 flex gap-3">
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-slate-100 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50"
        >
          <option value="all">Tất cả hành động</option>
          {actions.map(a => <option key={a} value={a}>{ACTION_VI[a] || a}</option>)}
        </select>
        <select
          value={entityFilter}
          onChange={e => setEntityFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-slate-100 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50"
        >
          <option value="all">Tất cả module</option>
          {entities.map(e => <option key={e} value={e}>{MODULE_VI[e] || e}</option>)}
        </select>
        <span className="ml-auto text-xs text-slate-500 flex items-center">{filtered.length} bản ghi</span>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-3">
          {filtered.map((log) => (
            <div key={log.log_id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 shrink-0">
                <span className={`material-symbols-outlined text-[16px] ${(ACTION_COLOR[log.action.toUpperCase()] ?? 'text-slate-500 bg-slate-100').split(' ')[0]}`}>
                  {ACTION_ICON[log.action.toUpperCase()] ?? 'info'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-slate-900 text-sm">{log.user}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ACTION_COLOR[log.action.toUpperCase()] ?? 'text-slate-600 bg-slate-100'}`}>
                    {ACTION_VI[log.action] || log.action.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {MODULE_VI[log.entity_type] || log.entity_type}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{log.description}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Mã: {log.entity_id} · {formatDateTime(log.log_time)}
                </p>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl">history</span>
            <p className="mt-2 text-sm">Chưa có nhật ký nào được ghi nhận</p>
          </div>
        )}
      </div>
    </div>
  )
}
