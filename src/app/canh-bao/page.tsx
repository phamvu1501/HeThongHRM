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

    const abnormal = attToday.filter(a => ['Đi trễ', 'Về sớm', 'Vắng mặt', 'MISSING_CHECKOUT', 'LATE'].includes(a.status))
    abnormal.forEach(a => {
      let text = a.status.toLowerCase();
      const shift = shifts.find(s => s.shift_id === a.shift_id);

      if (a.status === 'Đi trễ' || a.status === 'LATE') {
        let lateMin = a.late_minutes || 0;
        if (lateMin === 0 && a.check_in && shift) {
           const [hIn, mIn] = a.check_in.split(':').map(Number);
           const [hStart, mStart] = shift.start_time.split(':').map(Number);
           lateMin = Math.max(0, (hIn * 60 + mIn) - (hStart * 60 + mStart));
        }
        text = `đi muộn ${lateMin} phút`;
      }

      if (a.status === 'Về sớm') {
        let earlyMin = a.early_leave_minutes || 0;
        if (earlyMin === 0 && a.check_out && shift) {
           const [hOut, mOut] = a.check_out.split(':').map(Number);
           const [hEnd, mEnd] = shift.end_time.split(':').map(Number);
           earlyMin = Math.max(0, (hEnd * 60 + mEnd) - (hOut * 60 + mOut));
        }
        text = `về sớm ${earlyMin} phút`;
      }

      if (a.status === 'MISSING_CHECKOUT') text = 'quên check-out';
      
      issues.push({
        id: a.attendance_id,
        severity: 'Cao',
        title: `${a.employee_name || a.employee_id} ${text}`,
        time: `${today.toLocaleDateString('vi-VN')} ${a.check_in || '00:00'}`,
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
             time: `${today.toLocaleDateString('vi-VN')} ${a.check_in || '00:00'}`,
             color: 'amber',
             raw: a,
             shift: null,
             detailText: 'Bản ghi chấm công có dấu hiệu sửa đổi trùng lặp nhiều lần trong ngày. Vui lòng kiểm tra trên máy chấm công để xác minh tính hợp lệ.'
           })
         }
       }
    })

    return issues
  }, [attendances, shifts])

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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Cảnh báo bất thường"
        subtitle="Quản lý và theo dõi các hành vi, sự kiện bất thường trên hệ thống"
      />

      <div className="flex-1 overflow-y-auto p-5">
        {alerts.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-5 text-[15px]">Cảnh báo chấm công</h3>
            <div className="space-y-3">
              {alerts.map(a => (
                <div key={a.id} onClick={() => setSelectedAlert(a)} className={`bg-${a.color}-50 border border-${a.color}-100 rounded-xl p-4 flex gap-6 items-center hover:shadow-sm transition-all cursor-pointer`}>
                  <span className={`text-${a.color}-600 font-black text-[13px] shrink-0 w-20`}>{a.severity}</span>
                  <div>
                    <p className="text-[14px] font-semibold text-slate-800">{a.title}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl">verified</span>
            <p className="mt-2 text-sm font-semibold">Tất cả đều ổn</p>
            <p className="mt-1 text-xs text-slate-500">Hệ thống không ghi nhận cảnh báo bất thường nào trong ngày hôm nay.</p>
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
