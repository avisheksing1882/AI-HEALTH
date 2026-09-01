import React from 'react';
import { Utensils, Flame, Sparkles, Plus, Camera } from 'lucide-react';
import { UserProfile, MealLog, DailyActivityLog } from '../types';
import { soundFx } from '../services/soundEffects';

interface CalorieBudgetCardProps {
  profile: UserProfile;
  meals: MealLog[];
  activity: DailyActivityLog;
  onOpenAIScanner: () => void;
  onOpenManualLogger: () => void;
}

export const CalorieBudgetCard: React.FC<CalorieBudgetCardProps> = ({
  profile,
  meals,
  activity,
  onOpenAIScanner,
  onOpenManualLogger,
}) => {
  const caloriesEaten = meals.reduce((acc, m) => acc + m.totalCalories, 0);
  const activeCaloriesBurned = activity.activeCaloriesBurned;
  const baseTarget = profile.calorieTarget;
  const netRemaining = baseTarget - caloriesEaten + activeCaloriesBurned;

  const totalProtein = meals.reduce((acc, m) => acc + m.totalProtein, 0);
  const totalCarbs = meals.reduce((acc, m) => acc + m.totalCarbs, 0);
  const totalFat = meals.reduce((acc, m) => acc + m.totalFat, 0);
  const totalFiber = meals.reduce((acc, m) => acc + m.totalFiber, 0);
  const totalSugar = meals.reduce((acc, m) => acc + m.totalSugar, 0);
  const totalSodium = meals.reduce((acc, m) => acc + m.totalSodium, 0);

  const proteinPct = Math.min(150, Math.round((totalProtein / Math.max(1, profile.proteinGramsTarget)) * 100));
  const carbsPct = Math.min(150, Math.round((totalCarbs / Math.max(1, profile.carbsGramsTarget)) * 100));
  const fatPct = Math.min(150, Math.round((totalFat / Math.max(1, profile.fatGramsTarget)) * 100));
  const fiberPct = Math.min(150, Math.round((totalFiber / Math.max(1, profile.fiberGramsTarget)) * 100));

  return (
    <div className="bg-white dark:bg-obsidian-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
      
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
            <Utensils className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Calorie & Nutrition Budget
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalized target based on BMR ({profile.bmr} kcal) & activity
            </p>
          </div>
        </div>

        {/* Quick Log Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { soundFx.playTap(); onOpenManualLogger(); }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-obsidian-800 hover:bg-slate-200 dark:hover:bg-obsidian-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Manual</span>
          </button>
          <button
            onClick={() => { soundFx.playTap(); onOpenAIScanner(); }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition transform active:scale-95"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>AI Food Lens</span>
          </button>
        </div>
      </div>

      {/* Main Formula Display */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-obsidian-950/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 mb-5">
        
        {/* Daily Target */}
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Daily Target
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
              {baseTarget.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-500">kcal</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Goal: {profile.fitnessGoal.replace('_', ' ')}</span>
        </div>

        {/* Food Intake */}
        <div className="flex flex-col border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800/80 pt-3 md:pt-0 md:pl-4">
          <span className="text-[11px] font-semibold text-rose-500 uppercase tracking-wider flex items-center gap-1">
            <span className="text-sm font-black">-</span> Food Eaten
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-extrabold text-rose-500">
              {caloriesEaten.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-500">kcal</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">{meals.length} meals logged</span>
        </div>

        {/* Exercise Burn */}
        <div className="flex flex-col border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800/80 pt-3 md:pt-0 md:pl-4">
          <span className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
            <span className="text-sm font-black">+</span> Active Burn
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-extrabold text-emerald-500">
              {activeCaloriesBurned.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-500">kcal</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Exercise & Steps</span>
        </div>

        {/* Remaining Net Calories */}
        <div className="flex flex-col border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800/80 pt-3 md:pt-0 md:pl-4 bg-emerald-500/5 dark:bg-emerald-950/20 -m-2 p-3 rounded-xl">
          <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Remaining Budget
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-2xl font-black ${netRemaining < 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
              {netRemaining.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-500">kcal</span>
          </div>
          <span className="text-[10px] font-medium text-slate-500 mt-1">
            {netRemaining < 0 ? 'Exceeded by ' + Math.abs(netRemaining) + ' kcal' : 'Available for snacks'}
          </span>
        </div>

      </div>

      {/* Macronutrient Distribution Bars */}
      <div>
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
          <span>Macronutrient Breakdown</span>
          <span className="text-slate-500 font-medium text-[11px]">Daily Target Progress</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          
          {/* Protein */}
          <div className="bg-slate-50 dark:bg-obsidian-950/80 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Protein
              </span>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                {proteinPct}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-obsidian-800 overflow-hidden mb-1.5">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, proteinPct)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{totalProtein}g</span>
              <span>/ {profile.proteinGramsTarget}g</span>
            </div>
          </div>

          {/* Carbs */}
          <div className="bg-slate-50 dark:bg-obsidian-950/80 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Carbs
              </span>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                {carbsPct}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-obsidian-800 overflow-hidden mb-1.5">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, carbsPct)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{totalCarbs}g</span>
              <span>/ {profile.carbsGramsTarget}g</span>
            </div>
          </div>

          {/* Healthy Fats */}
          <div className="bg-slate-50 dark:bg-obsidian-950/80 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Fats
              </span>
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                {fatPct}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-obsidian-800 overflow-hidden mb-1.5">
              <div
                className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, fatPct)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{totalFat}g</span>
              <span>/ {profile.fatGramsTarget}g</span>
            </div>
          </div>

          {/* Dietary Fiber */}
          <div className="bg-slate-50 dark:bg-obsidian-950/80 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Fiber
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                {fiberPct}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-obsidian-800 overflow-hidden mb-1.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, fiberPct)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{totalFiber}g</span>
              <span>/ {profile.fiberGramsTarget}g</span>
            </div>
          </div>

        </div>

        {/* Micronutrients Quick Pills */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500">
          <span>Micronutrients logged:</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-obsidian-800 font-medium">
            Sugar: <strong className="text-slate-700 dark:text-slate-300">{totalSugar}g</strong>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-obsidian-800 font-medium">
            Sodium: <strong className="text-slate-700 dark:text-slate-300">{totalSodium}mg</strong>
          </span>
        </div>
      </div>

    </div>
  );
};
