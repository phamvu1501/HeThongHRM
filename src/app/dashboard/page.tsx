'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { fetchData } from '@/lib/store'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { TopBar } from '@/components/TopBar'
import { AttendanceBot } from '@/components/AttendanceBot'
import type { AppData } from '@/lib/types'

// Lấy cảm hứng từ mẫu Dashboard Quản Trị HRM Tổng Lực & Dashboard Quản Trị Hệ Thống v1
const DEPT_COLORS = ['#bde619', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899']

export default function DashboardPage() {
   const [data, setData] = useState<AppData | null>(null)
   const [loading, setLoading] = useState(true)

   useEffect(() => {
      fetchData().then(res => {
         setData(res)
         setLoading(false)
      }).catch(err => {
         console.error(err)
         setLoading(false)
      })
   }, [])

   const stats = useMemo(() => {
      if (!data) return null
      const { employees, attendances, leaveRequests, payrolls, departments, logs } = data

      // Sử dụng ngày thực tế của hệ thống
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const todayStr = `${yyyy}-${mm}-${dd}`
      const currentMonthNum = today.getMonth() + 1

      // 1. Tổng nhân viên
      const activeEmp = employees.filter(e => e.status === 'Active')
      const totalEmp = activeEmp.length

      // 2. Đi làm hôm nay (tính tỉ lệ đúng giờ)
      // Lưu ý: Nếu dữ liệu trong Excel lưu là DD/MM/YYYY thì sẽ không khớp với todayStr (YYYY-MM-DD).
      // Ta chuẩn hóa work_date về YYYY-MM-DD để so sánh.
      const attToday = attendances.filter(a => {
         let wDate = a.work_date;
         if (wDate.includes('/')) {
            const parts = wDate.split('/');
            if (parts.length === 3) {
               // Assuming DD/MM/YYYY
               wDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
         }
         return wDate === todayStr;
      })
      const presentToday = attToday.filter(a => !!a.check_in).length
      const onTimeToday = attToday.filter(a => a.status === 'Đúng giờ' || a.status === 'Tăng ca').length
      const onTimeRate = presentToday > 0 ? ((onTimeToday / presentToday) * 100).toFixed(1) : (attToday.length > 0 ? '0.0' : '100')
      const abnormalAttendances = attToday.filter(a => ['Đi trễ', 'Về sớm', 'Vắng mặt'].includes(a.status))

      // 3. Đơn chờ duyệt
      const pendingLeaves = leaveRequests.filter(l => l.status === 'Chờ duyệt')

      // 4. Lương tháng này
      const currentMonthStr = todayStr.substring(0, 7) // '2026-06'
      let totalPayroll = payrolls.filter(p => p.month === currentMonthStr).reduce((s, p) => s + p.net_pay, 0)

      // Nếu hệ thống chưa chốt lương tháng hiện tại (total = 0), 
      // thì lấy tổng lương cơ bản của các nhân sự đang hoạt động làm lương tạm tính
      if (totalPayroll === 0) {
         totalPayroll = activeEmp.reduce((sum, emp) => sum + (emp.base_salary || 0), 0)
      }
      // 5. Cơ cấu phòng ban
      const deptStats = departments.filter(d => d.status === 'Active').map(dept => {
         const count = activeEmp.filter(e => e.department_id === dept.department_id).length
         return { name: dept.department_name, count }
      }).sort((a, b) => b.count - a.count).filter(d => d.count > 0)
      const totalDeptEmp = deptStats.reduce((s, d) => s + d.count, 0)

      // 6. Sinh nhật tháng này (có parse DOB)
      const birthdays = activeEmp.filter(e => {
         if (!e.dob) return false
         const [, m] = e.dob.split('-')
         return parseInt(m) === currentMonthNum
      }).map(e => {
         const [, m, d] = e.dob.split('-')
         const dept = departments.find(dp => dp.department_id === e.department_id)?.department_name || 'Khác'
         return { ...e, day: d, month: m, dept }
      }).sort((a, b) => parseInt(a.day) - parseInt(b.day))

      // 7. Hoạt động gần đây (Logs)
      const recentLogs = logs.sort((a, b) => b.log_time.localeCompare(a.log_time)).slice(0, 5)

      // 8. Biến động lương (gom nhóm lịch sử lương)
      const monthMap = new Map<string, number>()
      payrolls.forEach(p => {
         const m = p.month
         if (!monthMap.has(m)) monthMap.set(m, 0)
         monthMap.set(m, monthMap.get(m)! + p.net_pay)
      })

      // Nếu tháng hiện tại chưa có trong dữ liệu lịch sử (chưa chốt lương chính thức), 
      // thêm mức lương tạm tính vào biểu đồ
      if (!monthMap.has(currentMonthStr)) {
         monthMap.set(currentMonthStr, totalPayroll)
      }

      const sortedMonths = Array.from(monthMap.keys()).sort()
      const last6 = sortedMonths.slice(Math.max(sortedMonths.length - 6, 0))
      const payrollTrend = last6.map(m => {
         const [y, mm] = m.split('-')
         return { label: `T${parseInt(mm)}/${y.slice(2)}`, value: monthMap.get(m)! }
      })
      const maxVal = Math.max(...payrollTrend.map(t => t.value), 1)

      // 9. Lịch nghỉ sắp tới (đã duyệt, từ hôm nay trở đi)
      const upcomingLeaves = leaveRequests
         .filter(l => l.status === 'Đã duyệt' && l.to_date >= todayStr)
         .sort((a, b) => a.from_date.localeCompare(b.from_date))
         .slice(0, 5)

      return {
         totalEmp,
         presentToday,
         onTimeRate,
         pendingLeaves,
         totalPayroll,
         deptStats,
         totalDeptEmp,
         birthdays,
         recentLogs,
         payrollTrend,
         maxVal,
         currentMonthNum,
         upcomingLeaves,
         abnormalAttendances
      }
   }, [data])

   if (loading || !stats) {
      return (
         <div className="flex flex-col h-full bg-slate-50/50">
            <TopBar title="Dashboard Tổng Lực" subtitle="Đang kết nối hệ thống..." />
            <div className="flex-1 flex flex-col items-center justify-center">
               <div className="size-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-4xl text-primary animate-spin">data_usage</span>
               </div>
               <p className="text-sm font-bold text-slate-800">Đang phân tích dữ liệu...</p>
               <p className="text-xs text-slate-500 mt-1">Đọc trực tiếp từ file Excel HRM</p>
            </div>
         </div>
      )
   }

   const {
      totalEmp, onTimeRate, pendingLeaves, totalPayroll,
      deptStats, totalDeptEmp, birthdays, recentLogs,
      payrollTrend, maxVal, currentMonthNum, upcomingLeaves,
      abnormalAttendances
   } = stats

   const LOG_ICON: Record<string, string> = {
      CREATE: 'add_circle', UPDATE: 'edit', DELETE: 'delete',
      APPROVE: 'check_circle', REJECT: 'cancel'
   }
   const LOG_COLOR: Record<string, string> = {
      CREATE: 'text-emerald-700 bg-emerald-100', UPDATE: 'text-blue-700 bg-blue-100',
      DELETE: 'text-rose-700 bg-rose-100', APPROVE: 'text-violet-700 bg-violet-100',
      REJECT: 'text-amber-700 bg-amber-100'
   }
   const LOG_DEFAULT = 'text-slate-700 bg-slate-100'

   return (
      <div className="flex flex-col h-full overflow-hidden bg-background-light">
         <TopBar
            title="Dashboard Tổng Lực"
            subtitle="Báo cáo số liệu toàn diện thiết kế theo chuẩn"
         />

         <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8">

            {/* === HEADER STATS === */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
               <Link href="/nhan-vien" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow block">
                  <div className="flex items-start justify-between mb-4">
                     <div className="size-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[28px]">group</span>
                     </div>
                     <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Đang hoạt động</span>
                  </div>
                  <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-widest">Tổng nhân sự</p>
                  <div className="flex items-baseline gap-2 mt-1">
                     <h3 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">{totalEmp}</h3>
                  </div>
               </Link>

               <Link href="/cham-cong" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow block">
                  <div className="flex items-start justify-between mb-4">
                     <div className="size-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[28px]">how_to_reg</span>
                     </div>
                     <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Hôm nay</span>
                  </div>
                  <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-widest">Tỉ lệ đúng giờ</p>
                  <div className="flex items-baseline gap-2 mt-1">
                     <h3 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">{onTimeRate}%</h3>
                  </div>
               </Link>

               <Link href="/don-tu" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden block">
                  {pendingLeaves.length > 0 && (
                     <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                        <div className="absolute transform rotate-45 bg-rose-500 text-white text-[9px] font-black uppercase py-1 w-24 text-center right-[-24px] top-[14px] shadow-sm">Hot</div>
                     </div>
                  )}
                  <div className="flex items-start justify-between mb-4">
                     <div className={`size-12 rounded-xl flex items-center justify-center ${pendingLeaves.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                        <span className="material-symbols-outlined text-[28px]">pending_actions</span>
                     </div>
                     {pendingLeaves.length === 0 && (
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">Hoàn tất</span>
                     )}
                  </div>
                  <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-widest">Đơn chờ duyệt</p>
                  <div className="flex items-baseline gap-2 mt-1">
                     <h3 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">{pendingLeaves.length}</h3>
                  </div>
               </Link>

               <Link href="/bang-luong" className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 text-white hover:scale-[1.02] transform transition-transform block cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                     {/* Styling icon with primary color */}
                     <div className="size-12 rounded-xl bg-[#bde619] text-slate-900 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[28px]">account_balance_wallet</span>
                     </div>
                     <span className="text-[11px] font-bold text-[#bde619] bg-[#bde619]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">Tháng này</span>
                  </div>
                  <p className="text-[13px] font-semibold text-slate-400 uppercase tracking-widest">Lương tạm tính</p>
                  <div className="flex items-baseline gap-1.5 mt-1">
                     {totalPayroll > 0 ? (
                        <>
                           <h3 className="text-3xl lg:text-4xl font-black text-white tracking-tight">{(totalPayroll / 1000000).toFixed(1)}</h3>
                           <span className="text-sm font-bold text-[#bde619]">Tr VNĐ</span>
                        </>
                     ) : (
                        <h3 className="text-2xl font-black text-slate-400 tracking-tight">Chưa tính toán</h3>
                     )}
                  </div>
               </Link>
            </div>

            {/* === CHARTS === */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               {/* Donut Chart - Cơ cấu phòng ban */}
               <div className="col-span-1 lg:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center h-[340px]">
                  <div className="w-full flex justify-between items-center mb-6">
                     <h4 className="font-bold text-slate-900">Cơ cấu nhân sự</h4>
                     <button className="material-symbols-outlined text-slate-400 hover:text-slate-700">more_horiz</button>
                  </div>

                  <div className="flex-1 w-full flex items-center justify-center relative">
                     <div className="size-44 rounded-full border-[14px] border-slate-50 flex items-center justify-center shadow-inner">
                        <div className="text-center">
                           <p className="text-3xl font-black text-slate-900">{deptStats.length}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Phòng ban</p>
                        </div>
                     </div>

                     <svg className="absolute size-44 -rotate-90 pointer-events-none">
                        {(() => {
                           let currentAngle = 0
                           return deptStats.map((dept, i) => {
                              const pct = totalDeptEmp > 0 ? (dept.count / totalDeptEmp) : 0
                              const dashOffset = 465 - (pct * 465)
                              const rotateAngle = currentAngle
                              
                              currentAngle += pct * 360
                              
                              return (
                                 <circle
                                    key={dept.name}
                                    cx="88" cy="88" r="74"
                                    fill="none"
                                    stroke={DEPT_COLORS[i % DEPT_COLORS.length]}
                                    strokeWidth="14"
                                    strokeDasharray="465"
                                    strokeDashoffset={dashOffset}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000"
                                    style={{ transform: `rotate(${rotateAngle}deg)`, transformOrigin: '88px 88px' }}
                                 />
                              )
                           })
                        })()}
                     </svg>
                  </div>

                  <div className="w-full grid grid-cols-2 gap-x-2 gap-y-3 mt-4 px-2">
                     {deptStats.slice(0, 6).map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2">
                           <span className="w-3 h-3 rounded-md shrink-0 border border-black/5" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }}></span>
                           <span className="text-[11px] font-bold text-slate-700 truncate">{d.name} <span className="text-slate-400 font-medium">({d.count})</span></span>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Line Chart - Payroll Trend */}
               <div className="col-span-1 lg:col-span-8 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[340px]">
                  <div className="flex justify-between items-start mb-6">
                     <div>
                        <h4 className="font-bold text-slate-900 text-lg">Biến động quỹ lương Net</h4>
                        <p className="text-[12px] font-semibold text-slate-400 mt-1 flex items-center gap-1.5">
                           <span className="w-4 h-1 rounded-full bg-primary"></span> Thực tế 6 tháng qua
                        </p>
                     </div>
                     <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600">
                        {payrollTrend[0]?.label} - {payrollTrend[payrollTrend.length - 1]?.label}
                     </div>
                  </div>

                  <div className="flex-1 w-full flex items-end justify-between gap-2 relative mt-2 pt-6">
                     {/* Horizontal reference lines */}
                     <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {[4, 3, 2, 1].map(n => (
                           <div key={n} className="w-full border-t border-dashed border-slate-200 flex items-start h-0">
                              <span className="text-[9px] font-bold text-slate-300 -mt-2.5 bg-white pr-2">
                                 {((maxVal * (n / 4)) / 1000000).toFixed(0)}M
                              </span>
                           </div>
                        ))}
                        <div className="w-full border-t border-slate-200"></div>
                     </div>

                     {/* Bars */}
                     {payrollTrend.map((pt, i) => {
                        // Ensure a minimum height of 5% so bar is visible even if value is low
                        const pct = maxVal > 0 ? Math.max((pt.value / maxVal) * 100, 5) : 5
                        const isLast = i === payrollTrend.length - 1
                        return (
                           <div key={pt.label} className="relative z-10 flex flex-col items-center flex-1 h-full justify-end group">
                              {/* Hover Tooltip */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-800 text-white text-[10px] font-bold py-1 px-2 rounded-lg whitespace-nowrap shadow-lg">
                                 {formatCurrency(pt.value)}
                              </div>
                              {/* Bar */}
                              <div
                                 className={`w-full max-w-[32px] md:max-w-[48px] rounded-t-lg transition-all duration-500 ease-out group-hover:opacity-80
                              ${isLast ? 'bg-[#bde619] shadow-[0_0_15px_rgba(189,230,25,0.4)]' : 'bg-slate-200'}
                           `}
                                 style={{ height: `${pct}%` }}
                              ></div>
                              <span className="text-[10px] font-bold text-slate-500 mt-2">{pt.label}</span>
                           </div>
                        )
                     })}
                  </div>
               </div>
            </div>

            {/* === BOTTOM ROW === */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">

               {/* Lịch nghỉ sắp tới */}
               <div className="col-span-1 lg:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
                  <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white z-10">
                     <h4 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-500 bg-emerald-50 p-1.5 rounded-lg text-xl shrink-0">event_available</span>
                        Lịch nghỉ sắp tới
                     </h4>
                  </div>
                  <div className="flex-1 p-5 flex flex-col gap-3 relative z-10 overflow-y-auto max-h-[350px]">
                     {upcomingLeaves.length > 0 ? (
                        upcomingLeaves.map(leave => {
                           const isToday = leave.from_date <= '2026-02-28' && leave.to_date >= '2026-02-28' // Hardcoded todayStr for now, matching the logic above
                           const fromDateParts = leave.from_date.split('-')
                           return (
                              <div key={leave.leave_id} className="flex gap-4 items-start group">
                                 <div className={`size-12 rounded-xl flex flex-col items-center justify-center shadow-sm shrink-0 border ${isToday ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-slate-50 text-slate-800 border-slate-100'}`}>
                                    <span className={`text-[9px] font-bold uppercase tracking-tighter ${isToday ? 'text-emerald-100' : 'text-slate-400'}`}>T{fromDateParts[1]}</span>
                                    <span className="text-lg font-black leading-none mt-0.5">{fromDateParts[2]}</span>
                                 </div>
                                 <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-start justify-between">
                                       <p className="font-bold text-slate-900 truncate pr-2">{leave.employee_name}</p>
                                       <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isToday ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                          {leave.days} ngày
                                       </span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate mt-1">
                                       {leave.leave_type}
                                       {leave.from_date !== leave.to_date ? ` (đến ${leave.to_date.split('-')[2]}/${leave.to_date.split('-')[1]})` : ''}
                                    </p>
                                 </div>
                              </div>
                           )
                        })
                     ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-8">
                           <span className="material-symbols-outlined text-5xl opacity-20 mb-2">event_busy</span>
                           <p className="text-sm font-medium">Chưa có lịch nghỉ nào sắp tới.</p>
                        </div>
                     )}
                  </div>
                  <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                     <a href="/don-tu" className="text-xs font-bold text-primary hover:underline">Xem lịch chi tiết 👉</a>
                  </div>
               </div>

               {/* Recent Activity */}
               <div className="col-span-1 lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white z-10">
                     <h4 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                        Nhật ký H.Động
                     </h4>
                     <a href="/nhat-ky" className="text-sm font-bold text-primary hover:underline">Tất cả</a>
                  </div>
                  <div className="flex-1 p-2">
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                           <tbody className="divide-y divide-slate-50">
                              {recentLogs.map(log => (
                                 <tr key={log.log_id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-3 py-3 font-semibold text-slate-800">
                                       <div className="flex flex-col">
                                          <span>{log.user}</span>
                                          <span className="text-[10px] text-slate-400 font-medium">{formatDateTime(log.log_time)}</span>
                                       </div>
                                    </td>
                                    <td className="px-2 py-3">
                                       <span className={`px-2 py-1 text-[9px] font-bold rounded-md ${LOG_COLOR[log.action] || LOG_DEFAULT}`}>
                                          {log.action}
                                       </span>
                                    </td>
                                    <td className="px-3 py-3 text-slate-600 truncate max-w-[150px] text-xs" title={log.description}>
                                       {log.description}
                                    </td>
                                 </tr>
                              ))}
                              {recentLogs.length === 0 && (
                                 <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">Hệ thống chưa có bản ghi nhật ký nào.</td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>

               {/* Birthdays */}
               <div className="col-span-1 lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
                  {/* Decorative Background */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full pointer-events-none z-0"></div>

                  <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-white relative z-10">
                     <h4 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined text-rose-500 bg-rose-50 p-1.5 rounded-lg text-xl shrink-0">cake</span>
                        Sinh nhật T.{currentMonthNum}
                     </h4>
                  </div>

                  <div className="flex-1 p-5 flex flex-col gap-4 relative z-10 overflow-y-auto max-h-[350px]">
                     {birthdays.length > 0 ? (
                        birthdays.map((b, i) => (
                           <div key={b.employee_id} className="flex items-center gap-3 group">
                              <div className="size-10 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center shadow-sm group-hover:border-primary/50 group-hover:bg-primary/5 transition-colors shrink-0">
                                 <span className="text-lg font-black text-slate-800 leading-none">{b.day}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="font-bold text-sm text-slate-900 truncate">{b.full_name}</p>
                                 <p className="text-[10px] text-slate-500 truncate mt-0.5">{b.dept}</p>
                              </div>
                           </div>
                        ))
                     ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-4">
                           <span className="material-symbols-outlined text-4xl opacity-20 mb-2">sentiment_dissatisfied</span>
                           <p className="text-xs font-medium">Không có SN nào<br />trong tháng này.</p>
                        </div>
                     )}
                  </div>
               </div>

            </div>

         </div>
         <AttendanceBot abnormals={abnormalAttendances} />
      </div>
   )
}
