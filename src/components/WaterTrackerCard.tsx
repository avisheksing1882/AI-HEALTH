import React, { useState, useEffect } from 'react';
import { 
  Droplet, 
  Plus, 
  Minus, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Clock, 
  Edit3, 
  Trash2, 
  History,
  X
} from 'lucide-react';
import { DailyActivityLog, WaterLog, UserProfile } from '../types';
import { db } from '../services/db';
import { soundFx, triggerHaptic } from '../services/soundEffects';
import { calculateMedicallyAccurateHydration } from '../services/nutritionCalculator';

interface WaterTrackerCardProps {
  activity: DailyActivityLog;
  profile?: UserProfile;
  workoutMinutesToday?: number;
  selectedDate?: string;
  onWaterUpdated: (newAmountMl: number) => void;
  onLogWaterDelta?: (deltaMl: number) => void;
}

export const WaterTrackerCard: React.FC<WaterTrackerCardProps> = ({
  activity,
  profile,
  workoutMinutesToday = 0,
  selectedDate,
  onWaterUpdated,
  onLogWaterDelta,
}) => {
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [manualTotalInput, setManualTotalInput] = useState<string>('');
  const [mode, setMode] = useState<'add' | 'subtract'>('add');
  const [showHistory, setShowHistory] = useState(false);
  const [todayLogs, setTodayLogs] = useState<WaterLog[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = !selectedDate || selectedDate === todayStr;

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Dynamically calculate individualized clinical hydration recommendation
  const clinicalHydration = profile ? calculateMedicallyAccurateHydration(
    profile.weightKg,
    profile.gender,
    profile.age,
    profile.activityLevel,
    workoutMinutesToday,
    profile.healthConditions
  ) : null;

  const currentMl = Math.max(0, activity.waterMl || 0);
  const goalMl = clinicalHydration 
    ? clinicalHydration.totalRecommendedMl 
    : Math.max(1000, activity.waterGoalMl || 2500);
  const pct = Math.min(100, Math.round((currentMl / goalMl) * 100));

  // Load today's water logs from IndexedDB
  useEffect(() => {
    async function loadLogs() {
      if (!activity.userId || !activity.date) return;
      try {
        const logs = await db.waterLogs
          .where('userId')
          .equals(activity.userId)
          .and(w => w.date === activity.date)
          .reverse()
          .sortBy('time');
        setTodayLogs(logs);
      } catch (err) {
        console.warn('Error loading water logs:', err);
      }
    }
    loadLogs();
  }, [activity.userId, activity.date, currentMl]);

  const handleApplyDelta = (delta: number) => {
    soundFx.playWaterDrop();
    triggerHaptic();

    const actualDelta = mode === 'add' ? delta : -delta;
    const newTotal = Math.max(0, currentMl + actualDelta);
    onWaterUpdated(newTotal);

    if (mode === 'add' && onLogWaterDelta) {
      onLogWaterDelta(delta);
    }
  };

  const handleSaveExactTotal = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playTap();
    triggerHaptic();

    const parsed = parseInt(manualTotalInput, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onWaterUpdated(parsed);
      setIsEditingTotal(false);
      setManualTotalInput('');
    }
  };

  const handleResetToZero = () => {
    soundFx.playTap();
    if (window.confirm('Reset today\'s hydration to 0 ml?')) {
      onWaterUpdated(0);
      setIsEditingTotal(false);
    }
  };

  const handleDeleteLogEntry = async (logId: string, amount: number) => {
    soundFx.playTap();
    triggerHaptic();

    try {
      await db.waterLogs.delete(logId);
      setTodayLogs(prev => prev.filter(l => l.id !== logId));
      const newTotal = Math.max(0, currentMl - amount);
      onWaterUpdated(newTotal);
    } catch (e) {
      console.warn('Failed to delete water log entry:', e);
    }
  };

  return (
    <div className="bg-white dark:bg-obsidian-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between transition-all">
      
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center text-white">
              <Droplet className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Hydration Tracker
                </h4>
                {pct >= 100 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" /> Goal Met
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span>Daily Target: {(goalMl / 1000).toFixed(1)}L ({goalMl}ml)</span>
                {clinicalHydration && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    Clinical EFSA Standard
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                soundFx.playTap();
                setManualTotalInput(String(currentMl));
                setIsEditingTotal(!isEditingTotal);
              }}
              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20 transition flex items-center gap-1"
              title="Edit or correct exact water amount"
            >
              <Edit3 className="w-3 h-3" />
              <span>Correct Value</span>
            </button>
            <span className="text-xs font-black text-blue-500 px-2 py-0.5 rounded-full bg-blue-500/10">
              {pct}%
            </span>
          </div>
        </div>

        {/* Big Numbers & Direct Edit */}
        <div className="flex items-baseline justify-between my-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {(currentMl / 1000).toFixed(2)}
            </span>
            <span className="text-xs font-bold text-slate-400">
              Liters
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
              ({currentMl.toLocaleString()} / {goalMl.toLocaleString()} ml)
            </span>
          </div>

          {currentMl === 0 && !isToday && (
            <span className="text-xs text-amber-500 dark:text-amber-400 font-medium">
              No hydration logged for this date
            </span>
          )}

          <div className="flex items-center gap-2">
            {todayLogs.length > 0 && (
              <button
                onClick={() => { soundFx.playTap(); setShowHistory(!showHistory); }}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
              >
                <History className="w-3.5 h-3.5" />
                <span>{showHistory ? 'Hide Logs' : 'History'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Wave / Progress Bar */}
        <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-obsidian-950 overflow-hidden mb-3 border border-slate-200/50 dark:border-slate-800/50 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Direct Correction Drawer */}
        {isEditingTotal && (
          <form onSubmit={handleSaveExactTotal} className="p-3 mb-3 bg-blue-500/10 dark:bg-obsidian-950 rounded-2xl border border-blue-500/30 space-y-2.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Correct Today's Total Water
              </span>
              <button
                type="button"
                onClick={() => setIsEditingTotal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-2">
              <input
                type="number"
                value={manualTotalInput}
                onChange={(e) => setManualTotalInput(e.target.value)}
                placeholder="Enter exact total ml (e.g. 1500)"
                min="0"
                max="10000"
                className="flex-1 bg-white dark:bg-obsidian-900 border border-blue-500/30 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white font-black focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleResetToZero}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-xs font-bold transition"
                title="Reset to 0 ml"
              >
                Reset (0ml)
              </button>
            </div>
          </form>
        )}

        {/* Drink History & Delete Drawer */}
        {showHistory && (
          <div className="p-3 mb-3 bg-slate-50 dark:bg-obsidian-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 max-h-36 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Today's Logged Drinks
              </span>
              <span className="text-[10px] text-slate-400">
                {todayLogs.length} entries
              </span>
            </div>
            {todayLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between py-1 px-2 rounded-lg bg-white dark:bg-obsidian-900 border border-slate-200/60 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-500 font-medium">{log.time}</span>
                  <span className="font-bold text-blue-500">+{log.amountMl}ml</span>
                </div>
                <button
                  onClick={() => handleDeleteLogEntry(log.id, log.amountMl)}
                  className="p-1 text-slate-400 hover:text-rose-500 transition"
                  title="Delete this entry and subtract volume"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mode Switcher (+ Add vs - Subtract) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-obsidian-950 border border-slate-200/60 dark:border-slate-800">
            <button
              onClick={() => { soundFx.playTap(); setMode('add'); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                mode === 'add'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              + Add
            </button>
            <button
              onClick={() => { soundFx.playTap(); setMode('subtract'); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                mode === 'subtract'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              - Subtract
            </button>
          </div>

          <span className="text-[10px] text-slate-400">
            {mode === 'add' ? 'Tap size to add' : 'Tap size to deduct'}
          </span>
        </div>

        {/* Quick Amount Buttons */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {[
            { label: 'Cup', amount: 150 },
            { label: 'Glass', amount: 250 },
            { label: 'Bottle', amount: 500 },
            { label: 'Flask', amount: 750 }
          ].map(btn => (
            <button
              key={btn.amount}
              onClick={() => handleApplyDelta(btn.amount)}
              className={`py-2 px-1.5 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center border active:scale-95 ${
                mode === 'add'
                  ? 'bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 border-blue-500/20'
                  : 'bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 dark:text-rose-400 border-rose-500/20'
              }`}
            >
              <span className="text-[10px] opacity-75 font-normal">{btn.label}</span>
              <span>{mode === 'add' ? '+' : '-'}{btn.amount}ml</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
