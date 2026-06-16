'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchData } from '@/lib/store'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (username === 'admin' && password === '123123') {
      document.cookie = "role=ADMIN; path=/; max-age=86400"
      document.cookie = "auth=true; path=/; max-age=86400" // For backward compatibility
      router.push('/dashboard')
      router.refresh()
      return;
    }

    // Check Employee login
    if (password === '123123') {
      try {
        const data = await fetchData();
        const emp = data.employees.find(e => e.employee_code.toLowerCase() === username.toLowerCase() || e.employee_id.toLowerCase() === username.toLowerCase());
        
        if (emp) {
          document.cookie = "role=EMPLOYEE; path=/; max-age=86400"
          document.cookie = `empId=${emp.employee_id}; path=/; max-age=86400`
          document.cookie = "auth=true; path=/; max-age=86400"
          router.push('/dashboard')
          router.refresh()
          return;
        }
      } catch (err) {
        console.error('Login error:', err)
      }
    }

    setError('Tài khoản hoặc mật khẩu không chính xác!')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f8f6] p-4 absolute inset-0 z-50">
      <div className="max-w-[400px] w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 text-center bg-[#bde619]/10 border-b border-[#bde619]/20">
          <div className="w-16 h-16 bg-[#bde619] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#bde619]/30">
             <span className="material-symbols-outlined text-[32px] text-slate-900">lock_person</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">HRM System</h1>
          <p className="text-sm text-slate-500 mt-1">Đăng nhập để quản trị hệ thống</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm font-semibold rounded-xl text-center">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Tài khoản</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 transition-all text-sm font-medium"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Mật khẩu</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 transition-all text-sm font-medium"
              required
            />
          </div>
          
          <button 
            type="submit"
            className="w-full py-3.5 mt-2 rounded-xl text-slate-900 font-bold text-sm hover:opacity-90 transition-all active:scale-[0.98]"
            style={{ background: '#bde619' }}
          >
            Đăng nhập ngay
          </button>
        </form>
      </div>
    </div>
  )
}
