import React, { useState } from 'react';
import { Droplet, Plus, Minus, RotateCcw, Check, Sparkles, Clock } from 'lucide-react';
import { DailyActivityLog } from '../types';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface WaterTrackerCardProps {
  activity: DailyActivityLog;
  onWaterUpdated: (newAmountMl: number) => void;
  onLogWaterDelta?: (deltaMl: number) => void;
}

export const WaterTrackerCard: React.FC<WaterTrackerCardProps> = ({
  activity,
  onWaterUpdated,
  onLogWaterDelta,
}) => {
  const [customMl, setCustomMl] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [lastLoggedDelta, setLastLoggedDelta] = useState<number | null>(null);

  const currentMl = Math.max(0, activity.waterMl || 0);
  const goalMl = Math.max(1000, activity.waterGoalMl || 3000);
  const pct = Math.min(100, Math.round((currentMl / goalMl) * 100));

  const handleAddDelta = (delta: number) => {
    soundFx.playWaterDrop();
    triggerHaptic();
    setLastLoggedDelta(delta);

    const newTotal = Math.max(0, currentMl + delta);
    onWaterUpdated(newTotal);
    if (onLogWaterDelta) {
      onLogWaterDelta(delta);
    }
  };

  const handleUndo = () => {
    if (!lastLoggedDelta || currentMl <= 0) return;
    soundFx.playTap();
    triggerHaptic();

    const newTotal = Math.max(0, currentMl - lastLoggedDelta);
    onWaterUpdated(newTotal);
    setLastLoggedDelta(null);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customMl, 10);
    if (!isNaN(parsed) && parsed > 0) {
      handleAddDelta(parsed);
      setCustomMl('');
      setShowCustomInput(false);
    }
  };

  const handleReset = () => {
    soundFx.playTap();
    if (window.confirm('Reset today\'s hydration to 0 ml?')) {
      onWaterUpdated(0);
      setLastLoggedDelta(null);
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Daily Target: {(goalMl / 1000).toFixed(1)}L ({goalMl}ml)
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {lastLoggedDelta && (
              <button
                onClick={handleUndo}
                className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 rounded-lg bg-slate-100 dark:bg-obsidian-950 transition flex items-center gap-1"
                title="Undo last log"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>
            )}
            <span className="text-xs font-black text-blue-500 px-2 py-0.5 rounded-full bg-blue-500/10">
              {pct}%
            </span>
          </div>
        </div>

        {/* Big Numbers */}
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

          <button
            onClick={() => setShowCustomInput(!showCustomInput)}
            className="text-[11px] font-bold text-blue-500 hover:underline"
          >
            {showCustomInput ? 'Close' : '+ Custom'}
          </button>
        </div>

        {/* Dynamic Wave / Progress Bar */}
        <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-obsidian-950 overflow-hidden mb-4 border border-slate-200/50 dark:border-slate-800/50 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Custom Input Drawer */}
        {showCustomInput && (
          <form onSubmit={handleCustomSubmit} className="flex gap-2 mb-3 pt-1">
            <input
              type="number"
              value={customMl}
              onChange={(e) => setCustomMl(e.target.value)}
              placeholder="Enter ml (e.g. 350)"
              min="10"
              max="2000"
              className="flex-1 bg-slate-100 dark:bg-obsidian-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold"
              autoFocus
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/20"
            >
              Add
            </button>
          </form>
        )}
      </div>

      {/* Quick Add Buttons */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-1">
        <button
          onClick={() => handleAddDelta(150)}
          className="py-2 px-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 text-xs font-bold transition flex flex-col items-center justify-center border border-blue-500/20 active:scale-95"
          title="Small Cup (150ml)"
        >
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Cup</span>
          <span>+150ml</span>
        </button>
        <button
          onClick={() => handleAddDelta(250)}
          className="py-2 px-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 text-xs font-bold transition flex flex-col items-center justify-center border border-blue-500/20 active:scale-95"
          title="Standard Glass (250ml)"
        >
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Glass</span>
          <span>+250ml</span>
        </button>
        <button
          onClick={() => handleAddDelta(500)}
          className="py-2 px-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 text-xs font-bold transition flex flex-col items-center justify-center border border-blue-500/20 active:scale-95"
          title="Water Bottle (500ml)"
        >
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Bottle</span>
          <span>+500ml</span>
        </button>
        <button
          onClick={() => handleAddDelta(750)}
          className="py-2 px-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 text-xs font-bold transition flex flex-col items-center justify-center border border-blue-500/20 active:scale-95"
          title="Large Flask (750ml)"
        >
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Flask</span>
          <span>+750ml</span>
        </button>
      </div>

    </div>
  );
};
