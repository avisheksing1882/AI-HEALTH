import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Camera, 
  Dumbbell, 
  Scale, 
  Sparkles, 
  TrendingDown, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight 
} from 'lucide-react';
import { DailyActivityLog, MealLog, NutritionInsight, UserProfile, WorkoutLog, WeightLog } from '../types';
import { db } from '../services/db';
import { calculateWeeklyWeightAnalysis, WeeklyWeightAnalysis } from '../services/nutritionCalculator';
import { ActivityRings } from './ActivityRings';
import { CalorieBudgetCard } from './CalorieBudgetCard';
import { StepTrackerCard } from './StepTrackerCard';
import { WaterTrackerCard } from './WaterTrackerCard';
import { NutritionInsightsCard } from './NutritionInsightsCard';
import { MealsTimeline } from './MealsTimeline';
import { MedicationsCard } from './MedicationsCard';
import { soundFx } from '../services/soundEffects';

interface DashboardProps {
  profile: UserProfile;
  activity: DailyActivityLog;
  meals: MealLog[];
  workouts: WorkoutLog[];
  insights: NutritionInsight[];
  onOpenAIScanner: () => void;
  onOpenManualFoodLogger: () => void;
  onOpenWorkoutModal: () => void;
  onOpenWeightModal: () => void;
  onActivityUpdated: (act: DailyActivityLog) => void;
  onWaterUpdated: (amountMl: number) => void;
  onLogWaterDelta?: (deltaMl: number) => void;
  onDeleteMeal: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  profile,
  activity,
  meals,
  workouts,
  insights,
  onOpenAIScanner,
  onOpenManualFoodLogger,
  onOpenWorkoutModal,
  onOpenWeightModal,
  onActivityUpdated,
  onWaterUpdated,
  onLogWaterDelta,
  onDeleteMeal,
}) => {
  const [weeklyWeightAnalysis, setWeeklyWeightAnalysis] = useState<WeeklyWeightAnalysis | null>(null);

  useEffect(() => {
    async function loadWeightData() {
      const logs = await db.weightLogs.where('userId').equals(profile.id).sortBy('date');
      const analysis = calculateWeeklyWeightAnalysis(logs, profile.weightKg, profile.targetWeightKg);
      setWeeklyWeightAnalysis(analysis);
    }
    loadWeightData();
  }, [profile.id, profile.weightKg, profile.targetWeightKg]);

  return (
    <div className="space-y-4 sm:space-y-6 pt-1 sm:pt-2">
      {/* Top Welcome / Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Good {getGreeting()}, {profile.name.split(' ')[0]}
              </h1>
              <span className="text-xl">✨</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Your daily metabolic overview &bull; Goal: <strong className="text-emerald-500 font-semibold">{profile.fitnessGoal.replace('_', ' ')}</strong>
            </p>
          </div>

        {/* Quick Log Action Bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { soundFx.playTap(); onOpenAIScanner(); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition transform active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>AI Food Lens</span>
          </button>

          <button
            onClick={() => { soundFx.playTap(); onOpenWorkoutModal(); }}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-obsidian-900 hover:bg-slate-200 dark:hover:bg-obsidian-800 text-slate-700 dark:text-slate-300 transition"
            title="Log Workout"
          >
            <Dumbbell className="w-4 h-4" />
          </button>

          <button
            onClick={() => { soundFx.playTap(); onOpenWeightModal(); }}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-obsidian-900 hover:bg-slate-200 dark:hover:bg-obsidian-800 text-slate-700 dark:text-slate-300 transition"
            title="Log Weight"
          >
            <Scale className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 7-Day Recurring Weight Check-in Banner */}
      {weeklyWeightAnalysis && (
        <div className={`p-4 rounded-3xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${
          weeklyWeightAnalysis.isWeighInDue
            ? 'bg-purple-500/10 dark:bg-purple-950/30 border-purple-500/30 text-purple-900 dark:text-purple-100'
            : 'bg-white dark:bg-obsidian-900 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200'
        }`}>
          <div className="flex items-start gap-3.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              weeklyWeightAnalysis.isWeighInDue
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30 animate-pulse'
                : 'bg-purple-500/10 text-purple-500'
            }`}>
              <Scale className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold">
                  {weeklyWeightAnalysis.isWeighInDue ? '7-Day Progress Weigh-In Due' : '7-Day Weight Check-In'}
                </h4>
                {weeklyWeightAnalysis.isWeighInDue && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500 text-white">
                    Action Required
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {weeklyWeightAnalysis.isWeighInDue
                  ? `It has been ${weeklyWeightAnalysis.daysSinceLastEntry === 999 ? 'over 7' : weeklyWeightAnalysis.daysSinceLastEntry} days since your last weigh-in. Step on the scale to update your trajectory!`
                  : `Current: ${weeklyWeightAnalysis.lastWeightKg} kg &bull; Target: ${profile.targetWeightKg} kg &bull; ${weeklyWeightAnalysis.weeklyRateKgPerWeek !== 0 ? `${weeklyWeightAnalysis.weeklyRateKgPerWeek > 0 ? '+' : ''}${weeklyWeightAnalysis.weeklyRateKgPerWeek} kg/wk` : 'Stable'}`}
              </p>

              {weeklyWeightAnalysis.projectedGoalDate && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-1">
                  🎯 Estimated Target Goal Date: <strong>{weeklyWeightAnalysis.projectedGoalDate}</strong> ({weeklyWeightAnalysis.projectedWeeksToGoal} weeks)
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => { soundFx.playTap(); onOpenWeightModal(); }}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition active:scale-95 shrink-0 self-stretch sm:self-auto justify-center"
          >
            <span>{weeklyWeightAnalysis.isWeighInDue ? 'Log 7-Day Weight' : 'Update Weight'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Activity Rings & Calorie Budget Section */}
      <div id="section-overview" className="grid grid-cols-1 lg:grid-cols-12 gap-6 scroll-mt-28">
        
        {/* Concentric Progress Rings (Apple Health Style) */}
        <div className="lg:col-span-4 bg-white dark:bg-obsidian-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Activity Rings</span>
            <span className="text-[10px] uppercase font-bold text-emerald-500">Live Progress</span>
          </div>

          <ActivityRings
            moveCalories={activity.activeCaloriesBurned}
            moveGoal={profile.dailyActiveCalorieGoal}
            exerciseMinutes={activity.activeMinutes}
            exerciseGoal={profile.dailyExerciseMinutesGoal}
            steps={activity.steps}
            stepGoal={activity.stepGoal}
            size={190}
            strokeWidth={15}
          />
        </div>

        {/* Calorie & Macro Target Budget */}
        <div className="lg:col-span-8">
          <CalorieBudgetCard
            profile={profile}
            meals={meals}
            activity={activity}
            onOpenAIScanner={onOpenAIScanner}
            onOpenManualLogger={onOpenManualFoodLogger}
          />
        </div>

      </div>

      {/* Daily Medications & Supplements Section */}
      <div id="section-meds" className="scroll-mt-28">
        <MedicationsCard
          profile={profile}
          selectedDate={activity.date}
        />
      </div>

      {/* AI Nutrition Insights */}
      <div id="section-insights" className="scroll-mt-28">
        <NutritionInsightsCard insights={insights} />
      </div>

      {/* Main Grid: Steps & Water (Left) vs Meals Diary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Movement & Hydration */}
        <div className="lg:col-span-5 space-y-6">
          <div id="section-steps" className="scroll-mt-28">
            <StepTrackerCard
              activity={activity}
              profile={profile}
              onActivityUpdated={onActivityUpdated}
            />
          </div>

          <div id="section-water" className="scroll-mt-28">
            <WaterTrackerCard
              activity={activity}
              onWaterUpdated={onWaterUpdated}
              onLogWaterDelta={onLogWaterDelta}
            />
          </div>
        </div>

        {/* Right Column: Meals Timeline */}
        <div id="section-meals" className="lg:col-span-7 scroll-mt-28">
          <MealsTimeline
            meals={meals}
            healthConditions={profile.healthConditions}
            onDeleteMeal={onDeleteMeal}
            onOpenAIScanner={onOpenAIScanner}
            onOpenManualLogger={onOpenManualFoodLogger}
          />
        </div>
      </div>

    </div>
  );
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}
