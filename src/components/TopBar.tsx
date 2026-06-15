'use client'
import { useState } from 'react'

interface TopBarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  const [search, setSearch] = useState('')

  return (
    <header className="shrink-0 h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4">
      {/* Title */}
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-bold text-slate-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      {/* Search */}
      <div className="relative hidden md:block">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm kiếm toàn cục..."
          className="w-56 bg-slate-100 border-none rounded-xl pl-9 pr-4 py-2 text-sm
            text-slate-700 placeholder-slate-400
            focus:outline-none focus:ring-2 focus:ring-[#bde619]/60 focus:bg-white
            transition-all duration-200"
        />
      </div>

      {/* Notifications */}
      <button className="relative p-2 rounded-full hover:bg-slate-100 transition-colors">
        <span className="material-symbols-outlined text-slate-500 text-[20px]">notifications</span>
        <span
          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-white"
          style={{ background: '#ef4444' }}
        />
      </button>

      {/* Extra actions */}
      {actions}
    </header>
  )
}
