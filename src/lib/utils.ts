import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(' ')
}

export function formatCurrency(amount: number): string {
  if (!amount && amount !== 0) return '—'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export function getMonthDisplay(month: string): string {
  const [yr, mo] = month.split('-')
  return `Tháng ${mo}/${yr}`
}

export function getAttendanceStatusColor(status: string): string {
  switch (status) {
    case 'Đúng giờ': return 'text-emerald-600 bg-emerald-50'
    case 'Đi trễ': return 'text-amber-600 bg-amber-50'
    case 'Về sớm': return 'text-orange-600 bg-orange-50'
    case 'Vắng mặt': return 'text-red-600 bg-red-50'
    case 'Tăng ca': return 'text-[#7c5f00] bg-[#bde619]/20'
    case 'Nghỉ phép': return 'text-blue-600 bg-blue-50'
    default: return 'text-slate-600 bg-slate-100'
  }
}

export function getLeaveStatusColor(status: string): string {
  switch (status) {
    case 'Đã duyệt': return 'text-emerald-700 bg-emerald-100'
    case 'Chờ duyệt': return 'text-white bg-[#f59e0b] shadow-sm'
    case 'Từ chối': return 'text-red-700 bg-red-100'
    default: return 'text-slate-600 bg-slate-100'
  }
}

export function getPayrollStatusColor(status: string): string {
  switch (status) {
    case 'Đã thanh toán': return 'text-emerald-700 bg-emerald-100'
    case 'Chưa thanh toán': return 'text-red-700 bg-red-100'
    case 'Đang xử lý': return 'text-amber-700 bg-amber-100'
    default: return 'text-slate-600 bg-slate-100'
  }
}

export function getContractTypeColor(type: string): string {
  switch (type) {
    case 'Full-time': return 'text-blue-700 bg-blue-100'
    case 'Part-time': return 'text-purple-700 bg-purple-100'
    case 'Probation': return 'text-amber-700 bg-amber-100'
    case 'Contract': return 'text-slate-700 bg-slate-100'
    default: return 'text-slate-600 bg-slate-100'
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Active': return 'text-emerald-700 bg-emerald-100'
    case 'Inactive': return 'text-slate-600 bg-slate-100'
    default: return 'text-slate-600 bg-slate-100'
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

export function getAvatarColor(name: string): string {
  const colors = [
    'bg-violet-200 text-violet-700',
    'bg-blue-200 text-blue-700',
    'bg-emerald-200 text-emerald-700',
    'bg-amber-200 text-amber-700',
    'bg-rose-200 text-rose-700',
    'bg-cyan-200 text-cyan-700',
    'bg-orange-200 text-orange-700',
    'bg-teal-200 text-teal-700',
  ]
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}
