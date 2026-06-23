import { useState } from 'react';
import type { Attendance } from '@/lib/types';
import Image from 'next/image';

interface AttendanceBotProps {
  abnormals: Attendance[];
  duplicates?: Attendance[];
}

export function AttendanceBot({ abnormals, duplicates = [] }: AttendanceBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const todayStr = new Date().toLocaleDateString('vi-VN');
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className={`bg-white rounded-2xl shadow-2xl border border-primary/20 transition-all duration-300 mb-4 overflow-hidden animate-fade-up flex flex-col ${isExpanded ? 'w-[450px] h-[600px]' : 'w-80 h-[420px]'}`}>
          <div className="bg-gradient-to-r from-primary-dark to-primary text-slate-900 p-3 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full overflow-hidden bg-white border-2 border-white shadow-sm shrink-0">
                 <Image src="/robot-assistant.png" alt="Robot" width={32} height={32} className="object-cover" />
              </div>
              <div>
                 <h3 className="font-black text-sm leading-tight">Cảnh báo bất thường</h3>
                 <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Trợ lý HRM</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsExpanded(!isExpanded)} className="hover:bg-black/10 rounded-full p-1.5 transition-colors flex items-center justify-center" title={isExpanded ? "Thu nhỏ" : "Phóng to"}>
                <span className="material-symbols-outlined text-[16px]">{isExpanded ? 'close_fullscreen' : 'open_in_full'}</span>
              </button>
              <button onClick={() => setIsOpen(false)} className="hover:bg-black/10 rounded-full p-1.5 transition-colors flex items-center justify-center" title="Đóng">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-slate-50/50 flex flex-col">
              <div className="p-4">
                {abnormals.length > 0 ? (
                  <>
                    <p className="text-[13px] text-slate-600 mb-4 leading-relaxed">
                      Xin chào sếp! Hệ thống ghi nhận có <strong className="text-rose-600">{abnormals.length}</strong> nhân sự chấm công bất thường trong ngày <strong>{todayStr}</strong>:
                    </p>
                    <div className="space-y-3">
                      {abnormals.map((att) => (
                        <div key={att.attendance_id} className="bg-white p-3 rounded-xl border border-rose-100 shadow-[0_2px_10px_-3px_rgba(225,29,72,0.1)] flex flex-col gap-1.5 hover:border-rose-300 transition-colors">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800 text-sm truncate pr-2">{att.employee_name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 shrink-0">
                              {att.status}
                            </span>
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 flex justify-between items-center">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> {att.shift_name}</span>
                            {att.check_in && <span className="text-slate-700">Vào: {att.check_in}</span>}
                          </div>
                          {att.note && <div className="text-[11px] text-slate-400 italic mt-1 bg-slate-50 p-1.5 rounded border border-slate-100">"{att.note}"</div>}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-6 gap-3 h-full">
                    <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 mb-2">
                      <span className="material-symbols-outlined text-3xl">verified</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800">Tuyệt vời!</p>
                    <p className="text-xs text-slate-500 px-4 leading-relaxed">Ngày {todayStr} không có nhân sự nào chấm công trễ hay về sớm. Tất cả đều tuân thủ tốt!</p>
                  </div>
                )}
                
                {duplicates.length > 0 && (
                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <p className="text-[13px] text-slate-600 mb-3 leading-relaxed">
                      ⚠️ <strong>Cảnh báo:</strong> Có <strong className="text-amber-600">{duplicates.length}</strong> nhân sự chấm công nhiều lần hôm nay:
                    </p>
                    <div className="space-y-3">
                      {duplicates.map((att) => (
                        <div key={att.attendance_id} className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm flex flex-col gap-1.5 hover:border-amber-300 transition-colors">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800 text-sm truncate pr-2">{att.employee_name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 shrink-0">
                              Trùng lặp
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
          </div>

          <div className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
             {abnormals.length > 0 && (
               <a href="/cham-cong" className="flex-1 text-xs font-bold text-slate-900 bg-primary hover:bg-primary-dark py-2.5 rounded-xl transition-colors text-center inline-block shadow-sm">Chi tiết</a>
             )}
          </div>
        </div>
      )}

      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="relative group hover:scale-110 transition-transform duration-300"
        >
          {/* Avatar Container */}
          <div className="size-16 md:size-20 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white flex items-center justify-center">
             <Image 
                src="/robot-assistant.png" 
                alt="Robot" 
                width={80} 
                height={80} 
                className="object-cover w-full h-full"
             />
          </div>
          
          {/* Status Badge */}
          {abnormals.length > 0 || duplicates.length > 0 ? (
            <span className={`absolute top-0 right-0 text-white border-4 border-white text-xs font-black size-8 rounded-full flex items-center justify-center shadow-lg animate-bounce ${duplicates.length > 0 ? 'bg-amber-500' : 'bg-rose-500'}`}>
              {abnormals.length + duplicates.length}
            </span>
          ) : (
            <span className="absolute top-0 right-0 bg-emerald-500 text-white border-4 border-white size-6 rounded-full flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-[14px]">check</span>
            </span>
          )}
        </button>
      )}
    </div>
  );
}
