import React from 'react';
import { Droplet, Plus } from 'lucide-react';
import { DailyActivityLog } from '../types';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface WaterTrackerCardProps {
  activity: DailyActivityLog;
  onWaterUpdated: (newAmountMl: number) => void;
}

export const WaterTrackerCard: React.FC<WaterTrackerCardProps> = ({
  activity,
  onWaterUpdated,
}) => {
  const currentMl = activity.waterMl;
  const goalMl = activity.waterGoalMl;
  const pct = Math.min(100, Math.round((currentMl / Math.max(1, goalMl)) * 100));

  const handleAddWater = (amount: number) => {
    soundFx.playTap();
    triggerHaptic();
    onWaterUpdated(currentMl + amount);
  };

  return (
    <div className="bg-white dark:bg-obsidian-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
      
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 flex items-center justify-center">
              <Droplet className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Hydration Tracker
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Daily Goal: {(goalMl / 1000).toFixed(1)} L
              </p>
            </div>
          </div>
          <span className="text-xs font-extrabold text-blue-500">{pct}%</span>
        </div>

        {/* Big number */}
        <div className="flex items-baseline gap-1 my-2">
          <span className="text-2xl font-black text-slate-900 dark:text-white">
            {(currentMl / 1000).toFixed(2)}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            / {(goalMl / 1000).toFixed(1)} Liters ({currentMl} ml)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-obsidian-950 overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Quick Add Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => handleAddWater(250)}
          className="py-1.5 px-2 rounded-xl bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 text-xs font-bold transition flex items-center justify-center gap-1 border border-blue-500/20"
        >
          <Plus className="w-3 h-3" /> 250ml
        </button>
        <button
          onClick={() => handleAddWater(500)}
          className="py-1.5 px-2 rounded-xl bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 text-xs font-bold transition flex items-center justify-center gap-1 border border-blue-500/20"
        >
          <Plus className="w-3 h-3" /> 500ml
        </button>
        <button
          onClick={() => handleAddWater(750)}
          className="py-1.5 px-2 rounded-xl bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 text-xs font-bold transition flex items-center justify-center gap-1 border border-blue-500/20"
        >
          <Plus className="w-3 h-3" /> 750ml
        </button>
      </div>

    </div>
  );
};
