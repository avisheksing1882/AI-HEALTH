import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Flame, 
  Utensils, 
  Dumbbell, 
  Droplet, 
  Scale, 
  Plus,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { DailyActivityLog, MealLog, WorkoutLog, UserProfile } from '../types';
import { db } from '../services/db';
import { soundFx } from '../services/soundEffects';

interface HistoryCalendarViewProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  profile: UserProfile;
  onOpenAIScanner: () => void;
  onOpenWorkoutModal: () => void;
  onBackToDashboard?: () => void;
}

export const HistoryCalendarView: React.FC<HistoryCalendarViewProps> = ({
  selectedDate,
  onDateChange,
  profile,
  onOpenAIScanner,
  onOpenWorkoutModal,
  onBackToDashboard,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthActivities, setMonthActivities] = useState<Record<string, DailyActivityLog>>({});
  const [dayMeals, setDayMeals] = useState<MealLog[]>([]);
  const [dayWorkouts, setDayWorkouts] = useState<WorkoutLog[]>([]);

  useEffect(() => {
    loadMonthActivities();
  }, [currentMonth, profile.id]);

  useEffect(() => {
    loadSelectedDayDetails();
  }, [selectedDate, profile.id]);

  const loadMonthActivities = async () => {
    const all = await db.dailyActivity.where('userId').equals(profile.id).toArray();
    const map: Record<string, DailyActivityLog> = {};
    all.forEach(a => {
      map[a.date] = a;
    });
    setMonthActivities(map);
  };

  const loadSelectedDayDetails = async () => {
    const meals = await db.meals
      .where('userId')
      .equals(profile.id)
      .and(m => m.date === selectedDate)
      .toArray();

    const workouts = await db.workouts
      .where('userId')
      .equals(profile.id)
      .and(w => w.date === selectedDate)
      .toArray();

    setDayMeals(meals);
    setDayWorkouts(workouts);
  };

  const handlePrevMonth = () => {
    soundFx.playTap();
    const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    setCurrentMonth(prev);
  };

  const handleNextMonth = () => {
    soundFx.playTap();
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    setCurrentMonth(next);
  };

  // Generate calendar days grid
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: { dayNumber: number; dateStr: string; isCurrentMonth: boolean }[] = [];

  // Padding days before
  for (let i = 0; i < firstDayIndex; i++) {
    const d = new Date(year, month, -firstDayIndex + i + 1);
    calendarDays.push({
      dayNumber: d.getDate(),
      dateStr: d.toISOString().split('T')[0],
      isCurrentMonth: false,
    });
  }

  // Days in month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({
      dayNumber: d,
      dateStr,
      isCurrentMonth: true,
    });
  }

  const selectedActivity = monthActivities[selectedDate];
  const totalDayCaloriesIn = dayMeals.reduce((s, m) => s + m.totalCalories, 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {onBackToDashboard && (
              <button
                onClick={() => { soundFx.playTap(); onBackToDashboard(); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-obsidian-900 hover:bg-slate-200 dark:hover:bg-obsidian-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition border border-slate-200 dark:border-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </button>
            )}
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              History & Diary Archive
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Look back at any past day to inspect meals, step counts, and workouts
          </p>
        </div>

        {/* Month Navigator */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-obsidian-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-obsidian-800 text-slate-600 dark:text-slate-400 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-200">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-obsidian-800 text-slate-600 dark:text-slate-400 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid & Selected Day Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Monthly Calendar Grid */}
        <div className="lg:col-span-7 bg-white dark:bg-obsidian-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          
          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((item, idx) => {
              const act = monthActivities[item.dateStr];
              const isSelected = item.dateStr === selectedDate;
              const isToday = item.dateStr === new Date().toISOString().split('T')[0];

              return (
                <div
                  key={idx}
                  onClick={() => {
                    soundFx.playTap();
                    onDateChange(item.dateStr);
                  }}
                  className={`p-2 sm:p-2.5 rounded-2xl cursor-pointer transition flex flex-col items-center justify-between min-h-[64px] border ${
                    isSelected
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/25 scale-[1.03]'
                      : item.isCurrentMonth
                      ? 'bg-slate-50 dark:bg-obsidian-950/60 border-slate-200/70 dark:border-slate-800/80 hover:border-slate-400'
                      : 'opacity-30 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : ''}`}>
                      {item.dayNumber}
                    </span>
                    {isToday && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-cyan-500'}`} />
                    )}
                  </div>

                  {act && act.steps > 0 && (
                    <div className="flex flex-col items-center mt-1">
                      <span className={`text-[10px] font-mono font-bold ${
                        isSelected 
                          ? 'text-white' 
                          : act.isGoalMet 
                          ? 'text-emerald-500' 
                          : 'text-slate-500'
                      }`}>
                        {(act.steps / 1000).toFixed(1)}k
                      </span>
                      <div className="flex gap-0.5 mt-0.5">
                        {act.isGoalMet && (
                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-400'}`} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 pt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Step Goal Met
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" /> Current Date
            </span>
          </div>

        </div>

        {/* Selected Day Drill-Down View */}
        <div className="lg:col-span-5 bg-white dark:bg-obsidian-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Selected Day Overview
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h3>
            </div>

            {selectedActivity?.isGoalMet && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Goal Met
              </span>
            )}
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50 dark:bg-obsidian-950 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block">Steps</span>
              <strong className="text-sm font-black text-slate-800 dark:text-slate-100">
                {selectedActivity?.steps.toLocaleString() || 0}
              </strong>
            </div>

            <div className="bg-slate-50 dark:bg-obsidian-950 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block">Food In</span>
              <strong className="text-sm font-black text-orange-500">
                {totalDayCaloriesIn} <span className="text-[9px] font-normal text-slate-400">kcal</span>
              </strong>
            </div>

            <div className="bg-slate-50 dark:bg-obsidian-950 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block">Active Burn</span>
              <strong className="text-sm font-black text-emerald-500">
                {selectedActivity?.activeCaloriesBurned || 0} <span className="text-[9px] font-normal text-slate-400">kcal</span>
              </strong>
            </div>
          </div>

          {/* Meals on this day */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-orange-500" />
                Meals Logged ({dayMeals.length})
              </span>
              <button
                onClick={onOpenAIScanner}
                className="text-[11px] text-emerald-500 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Log Meal
              </button>
            </div>

            {dayMeals.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No meals logged on this date.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {dayMeals.map(meal => (
                  <div key={meal.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-obsidian-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{meal.title}</span>
                      <span className="text-[10px] text-slate-400">{meal.time} &bull; P:{meal.totalProtein}g C:{meal.totalCarbs}g F:{meal.totalFat}g</span>
                    </div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{meal.totalCalories} kcal</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Workouts on this day */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-emerald-500" />
                Workouts ({dayWorkouts.length})
              </span>
              <button
                onClick={onOpenWorkoutModal}
                className="text-[11px] text-emerald-500 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Workout
              </button>
            </div>

            {dayWorkouts.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No workout sessions on this date.</p>
            ) : (
              <div className="space-y-2">
                {dayWorkouts.map(w => (
                  <div key={w.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-obsidian-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{w.title}</span>
                      <span className="text-[10px] text-slate-400">{w.durationMinutes} mins &bull; {w.intensity}</span>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-500">{w.caloriesBurned} kcal</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
