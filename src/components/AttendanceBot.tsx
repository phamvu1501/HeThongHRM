import { useState, useRef, useEffect } from 'react';
import type { Attendance } from '@/lib/types';
import Image from 'next/image';

interface AttendanceBotProps {
  abnormals: Attendance[];
}

export function AttendanceBot({ abnormals }: AttendanceBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'bot', text: string}[]>([
    { role: 'bot', text: 'Chào sếp! Sếp cần em giúp gì không?' }
  ]);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const todayStr = new Date().toLocaleDateString('vi-VN');

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatMode]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputText('');

    setTimeout(() => {
      let botResponse = 'Dạ em nghe sếp! Sếp cứ dặn dò gì em ghi nhận hết ạ. 😊';
      const lowerMsg = userMsg.toLowerCase();
      if (lowerMsg.includes('thời tiết')) {
        botResponse = 'Thời tiết hôm nay nắng ráo, mát mẻ, rất hợp để anh em làm việc năng suất sếp ạ! 🌤️';
      } else if (lowerMsg.includes('vui vẻ') || lowerMsg.includes('trò chuyện')) {
        botResponse = 'Hôm nay công ty vui như trẩy hội sếp ạ! Mọi người đang làm việc cực kỳ nhiệt huyết! 🚀';
      } else if (lowerMsg.includes('đi muộn') || lowerMsg.includes('trễ') || lowerMsg.includes('vắng')) {
        botResponse = abnormals.length > 0 
          ? `Hôm nay có ${abnormals.length} nhân sự đi trễ/về sớm. Sếp có thể bấm "Quay lại" để xem chi tiết danh sách nhé! 🧐`
          : 'Hôm nay trộm vía không có ai đi muộn hay về sớm sếp ạ! 🎉';
      }

      setMessages(prev => [...prev, { role: 'bot', text: botResponse }]);
    }, 600);
  };

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
                 <h3 className="font-black text-sm leading-tight">Bot Kỷ Luật</h3>
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
            {!isChatMode ? (
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
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                        msg.role === 'user' 
                          ? 'bg-[#bde619] text-slate-900 rounded-tr-sm shadow-sm font-medium' 
                          : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleSend} className="mt-3 flex gap-2 shrink-0">
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Nhập tin nhắn..." 
                    className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                  />
                  <button type="submit" className="bg-primary text-slate-900 size-10 rounded-xl flex items-center justify-center hover:bg-primary-dark transition-colors shrink-0">
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
             {isChatMode ? (
               <button onClick={() => setIsChatMode(false)} className="flex-1 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-xl transition-colors">Quay lại danh sách</button>
             ) : (
               <button onClick={() => setIsChatMode(true)} className="flex-1 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-xl transition-colors">Trò chuyện</button>
             )}
             
             {!isChatMode && abnormals.length > 0 && (
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
          {abnormals.length > 0 ? (
            <span className="absolute top-0 right-0 bg-rose-500 text-white border-4 border-white text-xs font-black size-8 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              {abnormals.length}
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
