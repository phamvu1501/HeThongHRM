'use client'

import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
}

export function showToast(message: string, type: ToastType = 'success') {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('show-toast', { detail: { message, type } })
    window.dispatchEvent(event)
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const handleShowToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: ToastType }>
      const newToast: ToastItem = {
        id: Math.random().toString(36).substring(2, 9),
        message: customEvent.detail.message,
        type: customEvent.detail.type
      }
      setToasts(prev => [...prev, newToast])

      // Auto dismiss after 3 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id))
      }, 3000)
    }

    window.addEventListener('show-toast', handleShowToast)
    return () => window.removeEventListener('show-toast', handleShowToast)
  }, [])

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map(toast => {
        let bg = 'bg-white border-slate-200 text-slate-800'
        let icon = 'info'
        let iconColor = 'text-blue-500'

        if (toast.type === 'success') {
          bg = 'bg-emerald-50 border-emerald-100 text-emerald-900 shadow-emerald-100'
          icon = 'check_circle'
          iconColor = 'text-emerald-500'
        } else if (toast.type === 'error') {
          bg = 'bg-rose-50 border-rose-100 text-rose-900 shadow-rose-100'
          icon = 'error'
          iconColor = 'text-rose-500'
        } else if (toast.type === 'warning') {
          bg = 'bg-amber-50 border-amber-100 text-amber-900 shadow-amber-100'
          icon = 'warning'
          iconColor = 'text-amber-500'
        }

        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 p-4 rounded-xl border shadow-lg pointer-events-auto transition-all animate-toast-slide ${bg}`}
          >
            <span className={`material-symbols-outlined text-[20px] shrink-0 ${iconColor}`}>
              {icon}
            </span>
            <span className="text-sm font-semibold">{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-auto text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] font-bold">close</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
