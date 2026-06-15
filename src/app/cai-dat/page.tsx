'use client'
import { useState, useRef, useEffect } from 'react'
import { fetchData, saveSettings, logActivity } from '@/lib/store'
import { exportAllData } from '@/lib/excel'
import { formatDateTime } from '@/lib/utils'
import { TopBar } from '@/components/TopBar'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { SystemSetting } from '@/lib/types'

type SettingTab = 'general' | 'account' | 'data'

function DataStat({ icon, label, val, color }: { icon: string; label: string; val: number; color: string }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
        <span className="material-symbols-outlined text-[20px]" style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-xl font-black text-slate-900">{val}</p>
        <p className="text-[11px] text-slate-500">{label}</p>
      </div>
    </div>
  )
}

export default function CaiDatPage() {
  const [tab, setTab] = useState<SettingTab>('general')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [draftSettings, setDraftSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const [dataStats, setDataStats] = useState({
    employees: 0, attendances: 0, leaveRequests: 0, adjustments: 0, payrolls: 0, storageKb: 0,
  })

  // ---- LOAD EXCEL DATA ----
  useEffect(() => {
    fetchData().then(d => {
      setSettings(d.settings || [])
      const dr: Record<string, string> = {}
        ; (d.settings || []).forEach(s => { dr[s.setting_key] = s.setting_value })
      setDraftSettings(dr)

      setDataStats({
        employees: d.employees?.length || 0,
        attendances: d.attendances?.length || 0,
        leaveRequests: d.leaveRequests?.length || 0,
        adjustments: d.adjustments?.length || 0,
        payrolls: d.payrolls?.length || 0,
        storageKb: Math.round(JSON.stringify(d).length / 1024),
      })
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  const generalKeys = ['company_name', 'currency', 'annual_leave_days']
  const filterSettings = (keys: string[]) => settings.filter(s => keys.includes(s.setting_key))

  const tabs: { key: SettingTab; label: string; icon: string }[] = [
    { key: 'general', label: 'Tổng quan', icon: 'tune' },
    { key: 'account', label: 'Tài khoản', icon: 'manage_accounts' },
    { key: 'data', label: 'Dữ liệu & Excel', icon: 'table_chart' },
  ]

  // ---- HANDLE SAVE SETTINGS ----
  async function handleSave() {
    setSaving(true)
    try {
      // Cập nhật giá trị đang nhập vào mảng settings gốc
      const updatedSettings = settings.map(s => {
        if (draftSettings[s.setting_key] !== undefined) {
          return { ...s, setting_value: draftSettings[s.setting_key], updated_at: new Date().toISOString() }
        }
        return s
      })

      await saveSettings(updatedSettings)
      setSettings(updatedSettings)

      logActivity('UPDATE', 'cai-dat', 'SYSTEM', 'Cập nhật cấu hình hệ thống.')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      alert('Lỗi lưu cấu hình: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleExportAll() {
    setSaving(true)
    fetchData(true).then(data => {
      exportAllData({
        employees: data.employees,
        attendances: data.attendances,
        leaveRequests: data.leaveRequests,
        adjustments: data.adjustments,
        payrolls: data.payrolls,
      })
      logActivity('UPDATE', 'cai-dat', 'EXPORT', 'Trích xuất (Export) toàn bộ Database ra file Backup Excel.')
    }).catch(err => alert('Lỗi tải dữ liệu: ' + err.message)).finally(() => setSaving(false))
  }

  const currentSettings = tab === 'general' ? filterSettings(generalKeys) : []

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <TopBar title="Cài đặt hệ thống" subtitle="Đang đồng bộ..." />
        <div className="flex-1 flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">sync</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Cài đặt hệ thống"
        subtitle="Cấu hình tham số vận hành và quản lý dữ liệu HRM"
        actions={
          tab === 'general' ? (
            <button
              onClick={handleSave} disabled={saving}
              className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all ${saved ? 'bg-emerald-500 text-white' : 'text-slate-900 hover:opacity-90'
                } ${saving ? 'opacity-50' : ''}`}
              style={saved ? {} : { background: '#bde619' }}
            >
              <span className={`material-symbols-outlined text-[16px] ${saving ? 'animate-spin' : ''}`}>{saving ? 'sync' : saved ? 'check' : 'save'}</span>
              {saving ? 'Đang lưu...' : saved ? 'Đã lưu!' : 'Lưu cài đặt'}
            </button>
          ) : tab === 'data' ? (
            <button
              disabled={saving}
              onClick={handleExportAll}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl text-slate-900 hover:opacity-90 transition-all disabled:opacity-50"
              style={{ background: '#bde619' }}
            >
              <span className={`material-symbols-outlined text-[16px] ${saving ? 'animate-spin' : ''}`}>{saving ? 'sync' : 'download'}</span>
              Xuất toàn bộ Excel
            </button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="shrink-0 px-5 pt-4 bg-white border-b border-slate-200">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-xl border-b-2 transition-all ${tab === t.key
                ? 'border-[#bde619] text-slate-900 bg-[#bde619]/10'
                : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
              {t.label}
              {t.key === 'data' && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#bde619] text-slate-800 ml-1">MỚI</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'general' && (
          <div className="max-w-2xl space-y-4">
            {currentSettings.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm border border-slate-200 rounded-xl bg-slate-50">
                Không tìm thấy tham số cài đặt. Hãy kiểm tra sheet `cai-dat` trong file Excel!
              </div>
            )}
            {currentSettings.map(s => (
              <div key={s.setting_id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{s.description}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{s.setting_key}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                    {s.setting_type}
                  </span>
                </div>
                <input
                  type={s.setting_type === 'number' ? 'number' : s.setting_type === 'time' ? 'time' : 'text'}
                  value={draftSettings[s.setting_key] ?? ''}
                  onChange={(e) => setDraftSettings(p => ({ ...p, [s.setting_key]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 focus:bg-white transition-colors disabled:opacity-60"
                  disabled={saving}
                />
                <p className="text-[10px] text-slate-400 mt-2">
                  Cập nhật lần cuối: {formatDateTime(s.updated_at)}
                </p>
              </div>
            ))}
            <div className="bg-[#bde619]/10 border border-[#bde619]/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[18px]" style={{ color: '#5c8a00' }}>info</span>
                <h3 className="font-bold text-slate-900 text-sm">Thông tin phiên bản</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: 'Phiên bản ứng dụng', val: 'HRM v2026.1.0' },
                  { label: 'Framework', val: 'Next.js 15 · React 19' },
                  { label: 'Môi trường', val: 'Development' },
                  { label: 'Cơ sở dữ liệu', val: 'Excel (Local)' },
                ].map(i => (
                  <div key={i.label}>
                    <p className="text-slate-400">{i.label}</p>
                    <p className="font-semibold text-slate-700">{i.val}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'account' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#bde619] flex items-center justify-center text-slate-900 text-2xl font-black shadow-lg shadow-[#bde619]/20 shrink-0">
                A
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-slate-900">Admin Quản trị</h3>
                <p className="text-sm text-slate-500 mb-4">Quản trị viên hệ thống (Super Admin)</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Tên đăng nhập</label>
                    <input type="text" disabled value="admin" className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Email liên hệ</label>
                    <input type="text" disabled value="admin@hrm2026.local" className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-medium" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">lock</span>
                Đổi mật khẩu
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Mật khẩu hiện tại</label>
                  <input type="password" placeholder="••••••••" className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Mật khẩu mới</label>
                  <input type="password" placeholder="••••••••" className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50" />
                </div>
                <button type="button" onClick={() => alert('Chức năng đổi mật khẩu đã bị vô hiệu hóa trong phiên bản Demo.')} className="mt-2 px-5 py-2.5 text-sm font-bold text-slate-900 rounded-xl hover:opacity-90 transition-all inline-flex items-center gap-2" style={{ background: '#bde619' }}>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Cập nhật mật khẩu
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'data' && (
          /* ── DATA MANAGEMENT TAB ── */
          <div className="max-w-3xl space-y-6">

            {/* Stats */}
            <div>
              <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">analytics</span>
                Tổng quan cơ sở dữ liệu (Google Sheets)
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <DataStat icon="group" label="Nhân viên" val={dataStats.employees} color="#3b82f6" />
                <DataStat icon="schedule" label="Chấm công" val={dataStats.attendances} color="#10b981" />
                <DataStat icon="description" label="Đơn từ" val={dataStats.leaveRequests} color="#f59e0b" />
                <DataStat icon="add_card" label="Phụ cấp/KT" val={dataStats.adjustments} color="#8b5cf6" />
                <DataStat icon="payments" label="Bảng lương" val={dataStats.payrolls} color="#ef4444" />
                <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100">
                    <span className="material-symbols-outlined text-[20px] text-slate-500">grid_on</span>
                  </div>
                  <div>
                    <p className="text-xl font-black text-slate-900">Live</p>
                    <p className="text-[11px] text-slate-500">Trạng thái kết nối</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Export All */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#bde619' }}>
                  <span className="material-symbols-outlined text-[24px] text-slate-900">download</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 mb-1">Backup dữ liệu hiện tại</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Trích xuất toàn bộ dữ liệu hiện tại ngay lúc này gồm 5 modules chính ({dataStats.employees + dataStats.attendances + dataStats.leaveRequests + dataStats.adjustments + dataStats.payrolls} records) thành một file Backup .xlsx độc lập.
                  </p>
                  <button
                    disabled={saving}
                    onClick={handleExportAll}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-900 hover:opacity-90 transition-all disabled:opacity-50"
                    style={{ background: '#bde619' }}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${saving ? 'animate-spin' : ''}`}>{saving ? 'sync' : 'table_chart'}</span>
                    Tải file Backup Excel ngay
                  </button>
                </div>
              </div>
            </div>

            {/* Notice */}
            <div className="bg-blue-50 text-blue-800 rounded-xl border border-blue-200 p-5 flex gap-3">
              <span className="material-symbols-outlined text-blue-500 shrink-0">info</span>
              <div className="text-sm">
                <strong className="block mb-1">Cơ chế đồng bộ Google Sheets tự động</strong>
                Hệ thống HRM đang được kết nối trực tiếp với Database Google Sheets gốc. Việc tạo, sửa, xoá nhân sự hoặc bảng lương sẽ lập tức cập nhật thẳng vào file Google Sheets trực tuyến.
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  )
}
