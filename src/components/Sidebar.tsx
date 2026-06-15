'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getInitials, getAvatarColor } from '@/lib/utils'
import { loadData } from '@/lib/store'
import { exportAllData } from '@/lib/excel'

const NAV_ITEMS = [
  { href: '/dashboard', icon: 'dashboard', label: 'Tổng quan' },
  { href: '/nhan-vien', icon: 'group', label: 'Nhân viên' },
  { href: '/cham-cong', icon: 'schedule', label: 'Chấm công' },
  { href: '/don-tu', icon: 'description', label: 'Đơn từ' },
  { href: '/bang-luong', icon: 'payments', label: 'Bảng lương' },
  { href: '/phu-cap', icon: 'add_card', label: 'Phụ cấp & KT' },
  { href: '/danh-muc', icon: 'category', label: 'Danh mục' },
  { href: '/nhat-ky', icon: 'history', label: 'Nhật ký' },
  { href: '/cai-dat', icon: 'settings', label: 'Cài đặt' },
]

const currentUser = { name: 'Admin Quản trị', role: 'Quản trị hệ thống' }

export function Sidebar() {
  const pathname = usePathname()

  function handleLogout() {
    document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    window.location.href = '/login';
  }

  if (pathname === '/login') return null;

  function handleExportAll() {
    const data = loadData()
    exportAllData({
      employees: data.employees,
      attendances: data.attendances,
      leaveRequests: data.leaveRequests,
      adjustments: data.adjustments,
      payrolls: data.payrolls,
    })
  }

  return (
    <aside
      className="w-[240px] shrink-0 flex flex-col bg-white border-r border-slate-200 overflow-y-auto"
      style={{ height: '100vh', position: 'sticky', top: 0 }}
    >
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-3 px-5 py-5 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
          style={{ background: '#bde619' }}
        >
          <span className="material-symbols-outlined text-slate-900 text-[18px]">group_work</span>
        </div>
        <div className="flex-1 ml-3 mt-0.5">
          <h1 className="text-sm font-black text-slate-900 tracking-tight leading-tight">HRM</h1>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-0.5">SYSTEM 2026</p>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-150 cursor-pointer group
                ${isActive
                  ? 'text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
              `}
              style={isActive ? { background: '#bde619', fontWeight: 600 } : {}}
            >
              <span
                className={`material-symbols-outlined text-[20px] transition-colors ${isActive ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'
                  }`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Quick Export to Excel */}
      <div className="px-3 pb-3">
        <button
          onClick={handleExportAll}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 transition-all group border border-dashed border-slate-200 hover:border-[#bde619] hover:bg-[#bde619]/5"
          title="Xuất toàn bộ dữ liệu ra 1 file Excel (5 sheet)"
        >
          <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-[#7c9500]">table_chart</span>
          Xuất toàn bộ Excel
        </button>
      </div>

      {/* User profile */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(currentUser.name)}`}
          >
            {getInitials(currentUser.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncute">{currentUser.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{currentUser.role}</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Đăng xuất">
            <span className="material-symbols-outlined text-slate-400 text-[16px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
