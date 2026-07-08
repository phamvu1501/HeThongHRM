'use client'
import { useState, useMemo, useEffect } from 'react'
import { fetchData } from '@/lib/store'
import { TopBar } from '@/components/TopBar'
import { Modal } from '@/components/Modal'
import type { Attendance, Shift } from '@/lib/types'

export default function CanhBaoPage() {
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAlert, setSelectedAlert] = useState<any>(null)
  const [monthFilter, setMonthFilter] = useState('2026-07')

  useEffect(() => {
    setLoading(true)
    fetchData().then(data => {
      setAttendances(data.attendances || [])
      setShifts(data.shifts || [])
      setLoading(false)
    }).catch(err => {
      setError(err.message)
      setLoading(false)
    })
  }, [])

  const months = useMemo(() => {
    const set = new Set<string>()
    attendances.forEach(a => {
      if (a.work_date && a.work_date.length >= 7) {
        set.add(a.work_date.slice(0, 7))
      }
    })
    const list = Array.from(set).sort((a, b) => b.localeCompare(a))
    return list.length > 0 ? list : ['2026-07', '2026-06']
  }, [attendances])

  useEffect(() => {
    if (months.length > 0 && !months.includes(monthFilter)) {
      setMonthFilter(months[0])
    }
  }, [months, monthFilter])

  const violationLeaderboard = useMemo(() => {
    const monthlyAtts = attendances.filter(a => a.work_date.startsWith(monthFilter))
    const empViolations = new Map<string, {
      employee_id: string
      employee_name: string
      lateCount: number
      earlyCount: number
      absentCount: number
      total: number
    }>()

    monthlyAtts.forEach(a => {
      const isLate = a.status.includes('Đi trễ') || (a.late_minutes && a.late_minutes > 0)
      const isEarly = a.status.includes('Về sớm') || (a.early_leave_minutes && a.early_leave_minutes > 0)
      const isAbsent = a.status === 'Vắng mặt'

      if (isLate || isEarly || isAbsent) {
        const current = empViolations.get(a.employee_id) || {
          employee_id: a.employee_id,
          employee_name: a.employee_name || a.employee_id,
          lateCount: 0,
          earlyCount: 0,
          absentCount: 0,
          total: 0
        }
        if (isLate) current.lateCount++
        if (isEarly) current.earlyCount++
        if (isAbsent) current.absentCount++
        current.total = current.lateCount + current.earlyCount + current.absentCount
        empViolations.set(a.employee_id, current)
      }
    })

    return Array.from(empViolations.values()).sort((a, b) => b.total - a.total)
  }, [attendances, monthFilter])

  const alerts = useMemo(() => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const todayStr = `${yyyy}-${mm}-${dd}`

    const attToday = attendances.filter(a => {
      let wDate = a.work_date;
      if (wDate.includes('/')) {
         const parts = wDate.split('/');
         if (parts.length === 3) wDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return wDate === todayStr;
    })

    const issues: any[] = []

    const abnormal = attToday.filter(a => [
      'Đi trễ', 'Về sớm', 'Đi trễ & Về sớm', 'Thiếu check-out', 'Thiếu check-in', 'Vắng mặt', 'MISSING_CHECKOUT', 'LATE'
    ].includes(a.status))
    abnormal.forEach(a => {
      let text = a.status.toLowerCase();
      const shift = shifts.find(s => s.shift_id === a.shift_id);

      if (a.status === 'Đi trễ' || a.status === 'LATE') {
        let lateMin = a.late_minutes || 0;
        if (lateMin === 0 && a.check_in && shift) {
           const timePart = a.check_in.split(' ').pop() || '';
           const [hIn, mIn] = timePart.split(':').map(Number);
           const [hStart, mStart] = shift.start_time.split(':').map(Number);
           lateMin = Math.max(0, (hIn * 60 + mIn) - (hStart * 60 + mStart));
        }
        text = `đi muộn ${lateMin} phút`;
      }
      else if (a.status === 'Về sớm') {
        let earlyMin = a.early_leave_minutes || 0;
        if (earlyMin === 0 && a.check_out && shift) {
           const timePart = a.check_out.split(' ').pop() || '';
           const [hOut, mOut] = timePart.split(':').map(Number);
           const [hEnd, mEnd] = shift.end_time.split(':').map(Number);
           earlyMin = Math.max(0, (hEnd * 60 + mEnd) - (hOut * 60 + mOut));
        }
        text = `về sớm ${earlyMin} phút`;
      }
      else if (a.status === 'Đi trễ & Về sớm') {
        let lateMin = a.late_minutes || 0;
        if (lateMin === 0 && a.check_in && shift) {
           const timePartIn = a.check_in.split(' ').pop() || '';
           const [hIn, mIn] = timePartIn.split(':').map(Number);
           const [hStart, mStart] = shift.start_time.split(':').map(Number);
           lateMin = Math.max(0, (hIn * 60 + mIn) - (hStart * 60 + mStart));
        }
        let earlyMin = a.early_leave_minutes || 0;
        if (earlyMin === 0 && a.check_out && shift) {
           const timePartOut = a.check_out.split(' ').pop() || '';
           const [hOut, mOut] = timePartOut.split(':').map(Number);
           const [hEnd, mEnd] = shift.end_time.split(':').map(Number);
           earlyMin = Math.max(0, (hEnd * 60 + mEnd) - (hOut * 60 + mOut));
        }
        text = `đi muộn ${lateMin} phút và về sớm ${earlyMin} phút`;
      }
      else if (a.status === 'Thiếu check-out' || a.status === 'MISSING_CHECKOUT') {
        text = 'quên check-out';
      }
      else if (a.status === 'Thiếu check-in') {
        text = 'quên check-in';
      }
      
      issues.push({
        id: a.attendance_id,
        severity: 'Cao',
        title: `${a.employee_name || a.employee_id} ${text}`,
        time: `${today.toLocaleDateString('vi-VN')} ${a.check_in?.split(' ').pop() || '00:00'}`,
        color: 'rose',
        raw: a,
        shift: shift,
        detailText: text
      })
    })

    const empCount = new Map<string, number>()
    attToday.forEach(a => {
       const count = empCount.get(a.employee_id) || 0
       empCount.set(a.employee_id, count + 1)
    })
    
    attToday.forEach(a => {
       if (empCount.get(a.employee_id)! > 1) {
         if (!issues.find(i => i.id === a.attendance_id + '_dup')) {
           issues.push({
             id: a.attendance_id + '_dup',
             severity: 'Trung bình',
             title: `${a.employee_name || a.employee_id} bản ghi sửa nhiều lần`,
             time: `${today.toLocaleDateString('vi-VN')} ${a.check_in?.split(' ').pop() || '00:00'}`,
             color: 'amber',
             raw: a,
             shift: null,
             detailText: 'Bản ghi chấm công có dấu hiệu sửa đổi trùng lặp nhiều lần trong ngày. Vui lòng kiểm tra trên máy chấm công để xác minh tính hợp lệ.'
           })
         }
       }
    })

    // Gán thứ tự xếp hạng vi phạm tháng của nhân viên
    issues.forEach(issue => {
      const empId = issue.raw?.employee_id
      if (empId) {
        const leaderboardIndex = violationLeaderboard.findIndex(v => v.employee_id === empId)
        if (leaderboardIndex >= 0) {
          issue.rank = leaderboardIndex + 1
        }
      }
    })

    // Sắp xếp cảnh báo mới nhất lên đầu (theo giờ check-in thực tế giảm dần)
    issues.sort((a, b) => {
      const timeA = a.raw?.check_in?.split(' ').pop() || '00:00'
      const timeB = b.raw?.check_in?.split(' ').pop() || '00:00'
      return timeB.localeCompare(timeA)
    })

    return issues
  }, [attendances, shifts, violationLeaderboard])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">sync</span>
        <p className="mt-3 text-sm text-slate-500">Đang tải dữ liệu…</p>
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

  const renderLeaderboard = () => {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-900 text-[15px]">Xếp hạng vi phạm kỷ luật</h3>
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#bde619]/50 cursor-pointer font-semibold text-slate-700">
            {months.map(m => <option key={m} value={m}>Tháng {m.slice(5)}/{m.slice(0, 4)}</option>)}
          </select>
        </div>

        {violationLeaderboard.length > 0 ? (
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
            {violationLeaderboard.map((v, idx) => (
              <div key={v.employee_id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-red-100 text-red-600' :
                    idx === 1 ? 'bg-orange-100 text-orange-600' :
                    idx === 2 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 leading-tight">{v.employee_name}</h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Trễ: {v.lateCount} | Sớm: {v.earlyCount} | Vắng: {v.absentCount}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-100">
                    {v.total} vi phạm
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400">
            <span className="material-symbols-outlined text-3xl">verified</span>
            <p className="mt-2 text-xs font-semibold text-slate-800">Không ghi nhận vi phạm</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Tháng này tập thể đi làm rất đúng giờ và đầy đủ!</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Cảnh báo bất thường"
        subtitle="Quản lý và theo dõi các hành vi, sự kiện bất thường trên hệ thống"
      />

      <div className="flex-1 overflow-y-auto p-5">
        {alerts.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cột trái: Danh sách cảnh báo hôm nay */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-5 text-[15px]">Cảnh báo chấm công hôm nay</h3>
                <div className="space-y-3">
                  {alerts.map(a => (
                    <div key={a.id} onClick={() => setSelectedAlert(a)} className={`bg-${a.color}-50 border border-${a.color}-100 rounded-xl p-4 flex gap-6 items-center hover:shadow-sm transition-all cursor-pointer justify-between`}>
                      <div className="flex gap-6 items-center">
                        <span className={`text-${a.color}-600 font-black text-[13px] shrink-0 w-20`}>{a.severity}</span>
                        <div>
                          <p className="text-[14px] font-semibold text-slate-800">{a.title}</p>
                          <p className="text-xs font-medium text-slate-500 mt-1">{a.time}</p>
                        </div>
                      </div>
                      {a.rank && (
                        <div className="shrink-0">
                          <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 border border-rose-200">
                            Hạng {a.rank} vi phạm
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cột phải: Thống kê vi phạm kỷ luật tháng */}
            <div className="lg:col-span-5 space-y-6">
              {renderLeaderboard()}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-sm">
              <span className="material-symbols-outlined text-4xl text-emerald-500">verified</span>
              <p className="mt-2 text-sm font-bold text-slate-800">Tất cả đều ổn</p>
              <p className="mt-1 text-xs text-slate-500 mt-0.5">Hệ thống không ghi nhận cảnh báo bất thường nào trong ngày hôm nay.</p>
            </div>
            {renderLeaderboard()}
          </div>
        )}
      </div>

      <Modal open={!!selectedAlert} onClose={() => setSelectedAlert(null)} title="Chi tiết cảnh báo">
        {selectedAlert && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border bg-${selectedAlert.color}-50 border-${selectedAlert.color}-100`}>
              <h4 className={`text-${selectedAlert.color}-700 font-bold text-sm mb-1`}>{selectedAlert.title}</h4>
              <p className={`text-${selectedAlert.color}-600 text-xs`}>{selectedAlert.detailText}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
              <div>
                <p className="text-slate-500 mb-1 text-xs">Nhân viên</p>
                <p className="font-semibold text-slate-800">{selectedAlert.raw?.employee_name || selectedAlert.raw?.employee_id}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1 text-xs">Ngày ghi nhận</p>
                <p className="font-semibold text-slate-800">{selectedAlert.raw?.work_date}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1 text-xs">Giờ Check-in thực tế</p>
                <p className="font-semibold text-slate-800">{selectedAlert.raw?.check_in || '--:--'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1 text-xs">Giờ Check-out thực tế</p>
                <p className="font-semibold text-slate-800">{selectedAlert.raw?.check_out || '--:--'}</p>
              </div>
              {selectedAlert.shift && (
                <>
                  <div>
                    <p className="text-slate-500 mb-1 text-xs">Ca làm quy định</p>
                    <p className="font-semibold text-slate-800">{selectedAlert.shift?.shift_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1 text-xs">Giờ quy định</p>
                    <p className="font-semibold text-slate-800">{selectedAlert.shift?.start_time} - {selectedAlert.shift?.end_time}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
