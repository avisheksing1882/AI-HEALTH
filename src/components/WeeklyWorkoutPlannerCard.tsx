import React, { useState } from 'react';
import { 
  Calendar, 
  Dumbbell, 
  Flame, 
  Clock, 
  Sparkles, 
  Check, 
  ChevronRight, 
  ShieldCheck, 
  HeartPulse, 
  Info,
  Sliders
} from 'lucide-react';
import { UserProfile, WorkoutLog, DailyActivityLog } from '../types';
import { 
  generateWeeklyWorkoutPlan, 
  WeeklyWorkoutPlan, 
  PlannedWorkoutDay 
} from '../services/aiWorkoutService';
import { saveUserProfile, saveWorkoutLogWithCache, updateDailyActivity } from '../services/db';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface WeeklyWorkoutPlannerCardProps {
  profile: UserProfile;
  selectedDate: string;
  activity?: DailyActivityLog;
  onProfileUpdated?: (updated: UserProfile) => void;
  onWorkoutLogged?: (workout: WorkoutLog) => void;
  onActivityUpdated?: (act: DailyActivityLog) => void;
}

export const WeeklyWorkoutPlannerCard: React.FC<WeeklyWorkoutPlannerCardProps> = ({
  profile,
  selectedDate,
  activity,
  onProfileUpdated,
  onWorkoutLogged,
  onActivityUpdated,
}) => {
  const currentDays = profile.workoutDaysPerWeek || 4;
  const [selectedDays, setSelectedDays] = useState<number>(currentDays);
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [isLoggingDay, setIsLoggingDay] = useState<number | null>(null);
  const [loggedDays, setLoggedDays] = useState<number[]>([]);

  // Generate the plan
  const plan: WeeklyWorkoutPlan = generateWeeklyWorkoutPlan(selectedDays, profile);

  const handleSelectDays = async (days: number) => {
    soundFx.playTap();
    triggerHaptic();
    setSelectedDays(days);
    setActiveDayIndex(0);

    try {
      const updated = await saveUserProfile(profile.id, { workoutDaysPerWeek: days });
      if (onProfileUpdated) onProfileUpdated(updated);
    } catch (err) {
      console.warn('Failed to update workout days preference:', err);
    }
  };

  const handleLogPlannedWorkout = async (day: PlannedWorkoutDay) => {
    soundFx.playRingCelebration();
    triggerHaptic();
    setIsLoggingDay(day.dayNumber);

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newWorkout: WorkoutLog = {
      id: `planned-workout-${Date.now()}`,
      userId: profile.id,
      date: selectedDate,
      time: timeStr,
      type: day.type,
      title: day.dayName,
      durationMinutes: day.targetDurationMinutes,
      caloriesBurned: day.estimatedBurnKcal,
      intensity: 'moderate',
      notes: `Focus: ${day.focus}\nExercises:\n${day.exercises.map(e => `• ${e.name} (${e.setsAndRepsOrDuration}) - ${e.targetMuscles}`).join('\n')}`,
      source: 'manual',
      createdAt: new Date().toISOString()
    };

    try {
      await saveWorkoutLogWithCache(newWorkout);

      if (activity) {
        const updatedAct = await updateDailyActivity(profile.id, selectedDate, {
          activeMinutes: (activity.activeMinutes || 0) + day.targetDurationMinutes,
          activeCaloriesBurned: (activity.activeCaloriesBurned || 0) + day.estimatedBurnKcal,
        });
        if (onActivityUpdated) onActivityUpdated(updatedAct);
      }

      if (onWorkoutLogged) onWorkoutLogged(newWorkout);

      setLoggedDays(prev => [...prev, day.dayNumber]);
      setTimeout(() => {
        setIsLoggingDay(null);
      }, 2500);
    } catch (err) {
      console.error('Failed to log planned workout:', err);
      setIsLoggingDay(null);
    }
  };

  const selectedDay = plan.days[activeDayIndex] || plan.days[0];

  return (
    <div className="bg-white dark:bg-obsidian-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all">
      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md shadow-emerald-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-white dark:bg-obsidian-950 rounded-[14px] flex items-center justify-center">
              <Calendar className="w-5 h-5 text-teal-500" />
            </div>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Weekly Exercise Schedule & Routine</span>
              <span className="text-[10px] bg-teal-500/15 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full font-bold">
                Adaptive Splits
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalized for your {profile.fitnessGoal.replace('_', ' ')} goal & physiological recovery capacity
            </p>
          </div>
        </div>

        {/* Weekly Totals Badges */}
        <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-obsidian-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-800">
            <Clock className="w-3.5 h-3.5 text-teal-500" />
            <span>{plan.weeklyTargetMinutes} mins/wk</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 border border-emerald-500/20">
            <Flame className="w-3.5 h-3.5" />
            <span>~{plan.weeklyTargetCalories.toLocaleString()} kcal/wk</span>
          </div>
        </div>
      </div>

      {/* INPUT: "How many days in a week do you want to exercise?" */}
      <div className="py-4 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span>How many days a week do you want to exercise?</span>
            <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
              {selectedDays} Days / Week
            </span>
          </label>
          <span className="text-[11px] text-slate-400">
            WHO recommends 150-300 mins moderate activity/week
          </span>
        </div>

        {/* 1 to 7 Days Pill Selector */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((num) => {
            const isSelected = selectedDays === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => handleSelectDays(num)}
                className={`py-2.5 px-1 sm:px-3 rounded-2xl font-black text-xs sm:text-sm transition-all flex flex-col items-center justify-center gap-0.5 border ${
                  isSelected
                    ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white border-emerald-500 shadow-md shadow-emerald-500/25 scale-[1.03]'
                    : 'bg-slate-50 dark:bg-obsidian-950 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                <span>{num}</span>
                <span className="text-[9px] font-semibold opacity-80 uppercase tracking-tighter">
                  {num === 1 ? 'Day' : 'Days'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Routine Overview Banner */}
      <div className="p-3.5 rounded-2xl bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/20 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-teal-500 shrink-0" />
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            {plan.splitName}
          </h4>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {plan.overview}
        </p>
      </div>

      {/* Day Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-3">
        {plan.days.map((day, idx) => {
          const isActive = idx === activeDayIndex;
          const isLogged = loggedDays.includes(day.dayNumber);

          return (
            <button
              key={day.dayNumber}
              type="button"
              onClick={() => { soundFx.playTap(); setActiveDayIndex(idx); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                isActive
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                  : 'bg-slate-100 dark:bg-obsidian-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-obsidian-700'
              }`}
            >
              <span>Day {day.dayNumber}</span>
              {isLogged && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          );
        })}
      </div>

      {/* ACTIVE DAY EXERCISE DETAILS CARD */}
      {selectedDay && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-obsidian-950/70 border border-slate-200/80 dark:border-slate-800 space-y-4 animate-fade-in">
          
          {/* Day Title & Meta Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/80">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                Workout Program
              </span>
              <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {selectedDay.dayName}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Target Muscle Focus: <strong className="text-slate-700 dark:text-slate-300">{selectedDay.focus}</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedDay.targetDurationMinutes}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">mins</span>
              </div>
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-emerald-500">
                  ~{selectedDay.estimatedBurnKcal}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">kcal</span>
              </div>
            </div>
          </div>

          {/* Clinical Health Safety Note if applicable */}
          {selectedDay.conditionSafeNote && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{selectedDay.conditionSafeNote}</span>
            </div>
          )}

          {/* Exercise List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Recommended Movements & Prescription:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {selectedDay.exercises.map((ex, i) => (
                <div 
                  key={i}
                  className="p-3 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200/80 dark:border-slate-800/90 text-xs space-y-1 shadow-xs hover:border-emerald-500/30 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {i + 1}. {ex.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      {ex.setsAndRepsOrDuration}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Muscles: {ex.targetMuscles}
                  </span>
                  {ex.clinicalTip && (
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 block pt-0.5">
                      💡 {ex.clinicalTip}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action: Log this planned workout today */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              Ready to train? Tap to log this routine directly for {selectedDate}.
            </span>

            <button
              type="button"
              onClick={() => handleLogPlannedWorkout(selectedDay)}
              disabled={isLoggingDay === selectedDay.dayNumber}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              {isLoggingDay === selectedDay.dayNumber ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Recorded!</span>
                </>
              ) : (
                <>
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span>Log Day {selectedDay.dayNumber} Today</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
