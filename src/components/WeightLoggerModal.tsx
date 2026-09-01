import React, { useState } from 'react';
import { X, Scale, Check, TrendingDown, Target } from 'lucide-react';
import { UserProfile, WeightLog } from '../types';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface WeightLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWeightSaved: (log: WeightLog) => void;
  selectedDate: string;
  profile: UserProfile;
}

export const WeightLoggerModal: React.FC<WeightLoggerModalProps> = ({
  isOpen,
  onClose,
  onWeightSaved,
  selectedDate,
  profile,
}) => {
  const [weightKg, setWeightKg] = useState<number>(profile.weightKg || 65);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const heightM = profile.heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));

  const getBmiCategory = (val: number) => {
    if (val < 18.5) return { label: 'Underweight', color: 'text-amber-500 bg-amber-500/10' };
    if (val < 24.9) return { label: 'Normal / Healthy Weight', color: 'text-emerald-500 bg-emerald-500/10' };
    if (val < 29.9) return { label: 'Overweight', color: 'text-amber-500 bg-amber-500/10' };
    return { label: 'Obese Class', color: 'text-rose-500 bg-rose-500/10' };
  };

  const bmiCat = getBmiCategory(bmi);
  const diffToTarget = Number((weightKg - profile.targetWeightKg).toFixed(1));

  const handleSave = () => {
    soundFx.playRingCelebration();
    triggerHaptic();

    const now = new Date();
    const weightLog: WeightLog = {
      id: `weight-${Date.now()}`,
      userId: profile.id,
      date: selectedDate,
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      weightKg,
      bmi,
      notes: notes.trim() || undefined,
    };

    onWeightSaved(weightLog);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-obsidian-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-obsidian-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-500 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Log Body Weight
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track body composition & BMI trends
              </p>
            </div>
          </div>

          <button
            onClick={() => { soundFx.playTap(); onClose(); }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-obsidian-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          
          {/* Main Weight Input */}
          <div className="text-center py-3 bg-slate-50 dark:bg-obsidian-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Body Weight (Kilograms)
            </label>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setWeightKg(prev => Number((prev - 0.1).toFixed(1)))}
                className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-obsidian-800 text-lg font-bold text-slate-700 dark:text-slate-200"
              >
                -
              </button>

              <input
                type="number"
                step="0.1"
                min="30"
                max="250"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-32 text-center text-4xl font-black bg-transparent border-b-2 border-purple-500 focus:outline-none text-slate-900 dark:text-white"
              />

              <button
                onClick={() => setWeightKg(prev => Number((prev + 0.1).toFixed(1)))}
                className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-obsidian-800 text-lg font-bold text-slate-700 dark:text-slate-200"
              >
                +
              </button>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">kg</span>
          </div>

          {/* BMI & Target Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-obsidian-950/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 block">Calculated BMI</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{bmi}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${bmiCat.color}`}>
                {bmiCat.label}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-obsidian-950/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 block">Target Weight</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400">
                  {profile.targetWeightKg} kg
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {diffToTarget > 0 ? `${diffToTarget} kg to lose` : `${Math.abs(diffToTarget)} kg to gain`}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Weigh-in Notes (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g. Fasted morning weigh-in, post-workout"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-obsidian-950 flex items-center justify-between">
          <button
            onClick={() => { soundFx.playTap(); onClose(); }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-obsidian-800 transition"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition"
          >
            <Check className="w-4 h-4" />
            <span>Save Weigh-In</span>
          </button>
        </div>

      </div>
    </div>
  );
};
