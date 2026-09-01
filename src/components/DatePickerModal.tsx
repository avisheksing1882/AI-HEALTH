import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, Sparkles } from 'lucide-react';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    return selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
  });

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  const handlePrevMonth = () => {
    soundFx.playTap();
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    soundFx.playTap();
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelect = (dateStr: string) => {
    soundFx.playTap();
    triggerHaptic();
    onSelectDate(dateStr);
    onClose();
  };

  const handleQuickJump = (daysAgo: number) => {
    soundFx.playTap();
    triggerHaptic();
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const dateStr = d.toISOString().split('T')[0];
    onSelectDate(dateStr);
    onClose();
  };

  // Calendar math
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];

  // Previous month padding
  for (let i = 0; i < firstDayIndex; i++) {
    const d = new Date(year, month, -firstDayIndex + i + 1);
    days.push({
      day: d.getDate(),
      dateStr: d.toISOString().split('T')[0],
      isCurrentMonth: false
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      day: d,
      dateStr,
      isCurrentMonth: true
    });
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm bg-white dark:bg-obsidian-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Select Log Date
            </h3>
          </div>

          <button
            onClick={() => { soundFx.playTap(); onClose(); }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-obsidian-800 transition flex items-center gap-1 text-xs font-semibold"
            title="Close Date Picker"
          >
            <span>Close</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Jump Buttons */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button
            onClick={() => handleQuickJump(0)}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition border ${
              selectedDate === todayStr
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                : 'bg-slate-100 dark:bg-obsidian-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => handleQuickJump(1)}
            className="py-1.5 px-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-obsidian-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 transition"
          >
            Yesterday
          </button>
          <button
            onClick={() => handleQuickJump(7)}
            className="py-1.5 px-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-obsidian-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 transition"
          >
            7 Days Ago
          </button>
        </div>

        {/* Month Navigator */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-obsidian-950 border border-slate-200/60 dark:border-slate-800/60">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-lg hover:bg-white dark:hover:bg-obsidian-800 text-slate-500 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-lg hover:bg-white dark:hover:bg-obsidian-800 text-slate-500 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day-of-week Headers */}
        <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 uppercase">
          <span>Su</span>
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((item, idx) => {
            const isSelected = item.dateStr === selectedDate;
            const isToday = item.dateStr === todayStr;
            const isFuture = item.dateStr > todayStr;

            return (
              <button
                key={idx}
                disabled={isFuture}
                onClick={() => handleSelect(item.dateStr)}
                className={`h-9 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center relative ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md shadow-emerald-500/30'
                    : isToday
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : item.isCurrentMonth
                    ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-obsidian-800'
                    : 'text-slate-300 dark:text-slate-600 opacity-40'
                } ${isFuture ? 'opacity-20 cursor-not-allowed' : 'active:scale-95'}`}
              >
                <span>{item.day}</span>
                {isToday && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-emerald-500 absolute bottom-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <span className="text-[11px] text-slate-400">
            Selected: <strong className="text-slate-700 dark:text-slate-300">{selectedDate}</strong>
          </span>
          <button
            onClick={() => { soundFx.playTap(); onClose(); }}
            className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
