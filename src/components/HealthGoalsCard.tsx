import React, { useState } from 'react';
import { 
  Target, 
  Droplet, 
  Flame, 
  Footprints, 
  Dumbbell, 
  Scale, 
  ShieldCheck, 
  Sparkles, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertTriangle,
  Sliders,
  Award
} from 'lucide-react';
import { UserProfile, DailyActivityLog, MealLog, WorkoutLog } from '../types';
import { 
  calculateComprehensiveHealthGoals, 
  ComprehensiveHealthGoals 
} from '../services/nutritionCalculator';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface HealthGoalsCardProps {
  profile: UserProfile;
  activity: DailyActivityLog;
  meals: MealLog[];
  workouts: WorkoutLog[];
  onOpenSettings?: () => void;
}

export const HealthGoalsCard: React.FC<HealthGoalsCardProps> = ({
  profile,
  activity,
  meals,
  workouts,
  onOpenSettings
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'hydration' | 'calories' | 'macros' | 'activity'>('hydration');

  // Compute total workout minutes logged today
  const todayWorkoutMinutes = workouts.reduce((acc, w) => acc + (w.durationMinutes || 0), 0);

  // Compute total calories & macros consumed today
  const totalCalories = Math.round(meals.reduce((acc, m) => acc + (Number(m.totalCalories) || 0), 0));
  const totalProtein = Math.round(meals.reduce((acc, m) => acc + (Number(m.totalProtein) || 0), 0) * 10) / 10;
  const totalCarbs = Math.round(meals.reduce((acc, m) => acc + (Number(m.totalCarbs) || 0), 0) * 10) / 10;
  const totalFat = Math.round(meals.reduce((acc, m) => acc + (Number(m.totalFat) || 0), 0) * 10) / 10;
  const totalFiber = Math.round(meals.reduce((acc, m) => acc + (Number(m.totalFiber) || 0), 0) * 10) / 10;
  const currentWaterMl = Math.max(0, activity.waterMl || 0);

  // Calculate clinically verified personalized goals
  const goals: ComprehensiveHealthGoals = calculateComprehensiveHealthGoals(
    profile, 
    todayWorkoutMinutes
  );

  // Hydration progress percentage
  const hydrationPct = Math.min(100, Math.round((currentWaterMl / goals.hydration.totalRecommendedMl) * 100));
  // Calorie progress percentage
  const caloriePct = Math.min(150, Math.round((totalCalories / goals.calorieTarget) * 100));
  // Step progress percentage
  const stepPct = Math.min(100, Math.round((activity.steps / goals.activityGoals.dailyStepGoal) * 100));
  // Exercise minutes progress percentage
  const exercisePct = Math.min(100, Math.round((activity.activeMinutes / goals.activityGoals.dailyExerciseMinutesGoal) * 100));

  return (
    <div className="bg-white dark:bg-obsidian-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-500 p-0.5 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <div className="w-full h-full bg-white dark:bg-obsidian-950 rounded-[14px] flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Verified Health & Fitness Goals
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                Medically Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalized targets calibrated to your {profile.weightKg}kg body weight, gender & activity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onOpenSettings && (
            <button
              onClick={() => { soundFx.playTap(); onOpenSettings(); }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-obsidian-800 hover:bg-slate-200 dark:hover:bg-obsidian-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center gap-1.5"
              title="Customize Goals"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-500" />
              <span>Customize</span>
            </button>
          )}

          <button
            onClick={() => { soundFx.playTap(); setIsExpanded(!isExpanded); }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-obsidian-800 transition"
            title={isExpanded ? "Collapse Details" : "Expand Details"}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 4 Quick Key Target Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
        
        {/* 1. Personalized Hydration Target Card */}
        <div 
          onClick={() => { soundFx.playTap(); setActiveTab('hydration'); setIsExpanded(true); }}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'hydration' && isExpanded
              ? 'bg-cyan-500/10 border-cyan-500/40 ring-2 ring-cyan-500/20'
              : 'bg-slate-50/80 dark:bg-obsidian-950/60 border-slate-200/80 dark:border-slate-800/80 hover:border-cyan-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Droplet className="w-4 h-4 text-cyan-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Hydration</span>
            </div>
            <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
              {hydrationPct}%
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {goals.hydration.totalRecommendedMl.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400">ml/day</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-obsidian-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${hydrationPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
            <span>{currentWaterMl} ml logged</span>
            <span>~{goals.hydration.glassesCount} glasses</span>
          </div>
        </div>

        {/* 2. Calorie & Metabolic Energy Target Card */}
        <div 
          onClick={() => { soundFx.playTap(); setActiveTab('calories'); setIsExpanded(true); }}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'calories' && isExpanded
              ? 'bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/20'
              : 'bg-slate-50/80 dark:bg-obsidian-950/60 border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Calories</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {caloriePct}%
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {goals.calorieTarget.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400">kcal/day</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-obsidian-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, caloriePct)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
            <span>{totalCalories} eaten</span>
            <span>{Math.max(0, goals.calorieTarget - totalCalories)} left</span>
          </div>
        </div>

        {/* 3. Protein & Satiety Target Card */}
        <div 
          onClick={() => { soundFx.playTap(); setActiveTab('macros'); setIsExpanded(true); }}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'macros' && isExpanded
              ? 'bg-purple-500/10 border-purple-500/40 ring-2 ring-purple-500/20'
              : 'bg-slate-50/80 dark:bg-obsidian-950/60 border-slate-200/80 dark:border-slate-800/80 hover:border-purple-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Protein</span>
            </div>
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
              {goals.macroTargets.proteinPerKg}g/kg
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {goals.macroTargets.proteinGramsTarget}
            </span>
            <span className="text-[11px] text-slate-400">g/day</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-obsidian-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round((totalProtein / Math.max(1, goals.macroTargets.proteinGramsTarget)) * 100))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
            <span>{Math.round(totalProtein)}g taken</span>
            <span>{goals.macroTargets.proteinCaloriesPct}% energy</span>
          </div>
        </div>

        {/* 4. Daily Step Count Target Card */}
        <div 
          onClick={() => { soundFx.playTap(); setActiveTab('activity'); setIsExpanded(true); }}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'activity' && isExpanded
              ? 'bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/20'
              : 'bg-slate-50/80 dark:bg-obsidian-950/60 border-slate-200/80 dark:border-slate-800/80 hover:border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Footprints className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Daily Steps</span>
            </div>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
              {stepPct}%
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {goals.activityGoals.dailyStepGoal.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400">steps</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-obsidian-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${stepPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
            <span>{activity.steps.toLocaleString()} steps</span>
            <span>{goals.activityGoals.dailyExerciseMinutesGoal}m exercise</span>
          </div>
        </div>

      </div>

      {/* Expanded Clinical Breakdown Details */}
      {isExpanded && (
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-fade-in">
          
          {/* Navigation Pill Tabs inside expanded view */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab('hydration')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'hydration'
                  ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-100 dark:bg-obsidian-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Droplet className="w-3.5 h-3.5" />
              <span>Hydration Science</span>
            </button>

            <button
              onClick={() => setActiveTab('calories')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'calories'
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-100 dark:bg-obsidian-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Metabolism & Calories</span>
            </button>

            <button
              onClick={() => setActiveTab('macros')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'macros'
                  ? 'bg-purple-500 text-white shadow-sm shadow-purple-500/20'
                  : 'bg-slate-100 dark:bg-obsidian-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Macro Targets</span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'activity'
                  ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                  : 'bg-slate-100 dark:bg-obsidian-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Activity & WHO Protocol</span>
            </button>
          </div>

          {/* TAB 1: HYDRATION SCIENCE (Addresses user's critical instruction) */}
          {activeTab === 'hydration' && (
            <div className="p-4 rounded-2xl bg-cyan-500/5 dark:bg-cyan-500/10 border border-cyan-500/20 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Clinical Hydration Recommendation</span>
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-full font-bold">
                      EFSA & ACSM Standard
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Hydration is <strong>never identical for everyone</strong>. Your target of <strong>{goals.hydration.totalRecommendedMl} ml</strong> (~{goals.hydration.glassesCount} glasses) is dynamically calculated from your physiological parameters:
                  </p>
                </div>
              </div>

              {/* Formula Breakdown Table */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 text-center">
                <div className="p-2.5 rounded-xl bg-white dark:bg-obsidian-900 border border-cyan-500/20 shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Base Body Weight</span>
                  <span className="text-sm font-black text-cyan-600 dark:text-cyan-400">{goals.hydration.baselineMl} ml</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">35 ml × {profile.weightKg} kg</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-obsidian-900 border border-cyan-500/20 shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Gender Muscle Water</span>
                  <span className="text-sm font-black text-slate-700 dark:text-slate-300">+{goals.hydration.genderAdjustmentMl} ml</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">{profile.gender === 'male' ? 'Male (73% lean water)' : 'Female standard'}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-obsidian-900 border border-cyan-500/20 shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Workout Sweat Loss</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">+{goals.hydration.activityAdjustmentMl} ml</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">{todayWorkoutMinutes > 0 ? `${todayWorkoutMinutes}m exercise logged` : `${profile.activityLevel} baseline`}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-obsidian-900 border border-cyan-500/20 shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Health Adjustments</span>
                  <span className="text-sm font-black text-purple-600 dark:text-purple-400">+{goals.hydration.conditionAdjustmentMl} ml</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Clinical protocol</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-obsidian-950/80 border border-cyan-500/20 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <Info className="w-4 h-4 text-cyan-500 shrink-0" />
                <span>{goals.hydration.clinicalRationale}</span>
              </div>
            </div>
          )}

          {/* TAB 2: METABOLISM & CALORIES */}
          {activeTab === 'calories' && (
            <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Mifflin-St Jeor Energy Balance</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                  Clinical Gold Standard
                </span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-white dark:bg-obsidian-900 border border-emerald-500/20">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Basal Metabolic Rate (BMR)</span>
                  <span className="text-base font-black text-slate-900 dark:text-white">{goals.bmr} kcal</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Coma calories (vital organ survival)</span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-obsidian-900 border border-emerald-500/20">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Energy (TDEE)</span>
                  <span className="text-base font-black text-slate-900 dark:text-white">{goals.tdee} kcal</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">BMR × {profile.activityLevel.replace('_', ' ')} factor</span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-obsidian-900 border border-emerald-500/20">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Daily Goal Target</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{goals.calorieTarget} kcal</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {goals.calorieDeficitOrSurplus < 0 
                      ? `${goals.calorieDeficitOrSurplus} kcal deficit`
                      : goals.calorieDeficitOrSurplus > 0 
                        ? `+${goals.calorieDeficitOrSurplus} kcal surplus` 
                        : 'Maintenance'}
                  </span>
                </div>
              </div>

              {goals.weightTrajectory.weeklyTargetRateKg !== 0 && (
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-obsidian-950/80 border border-emerald-500/20 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Projected Target: <strong>{profile.targetWeightKg} kg</strong> (Δ {goals.weightTrajectory.weightDeltaKg > 0 ? '+' : ''}{goals.weightTrajectory.weightDeltaKg} kg)</span>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ~{goals.weightTrajectory.projectedWeeks} weeks at {Math.abs(goals.weightTrajectory.weeklyTargetRateKg)} kg/wk
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MACRONUTRIENTS */}
          {activeTab === 'macros' && (
            <div className="p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Evidence-Based Macronutrient Split</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-bold">
                  Preserving Lean Body Mass
                </span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-white dark:bg-obsidian-900 border border-purple-500/20">
                  <span className="text-[10px] text-slate-400 block font-bold">Protein ({goals.macroTargets.proteinCaloriesPct}%)</span>
                  <span className="text-sm font-black text-purple-600 dark:text-purple-400">{goals.macroTargets.proteinGramsTarget}g</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">{Math.round(totalProtein)}g logged ({Math.round((totalProtein / Math.max(1, goals.macroTargets.proteinGramsTarget)) * 100)}%)</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-obsidian-900 border border-purple-500/20">
                  <span className="text-[10px] text-slate-400 block font-bold">Carbs ({goals.macroTargets.carbsCaloriesPct}%)</span>
                  <span className="text-sm font-black text-amber-500">{goals.macroTargets.carbsGramsTarget}g</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">{Math.round(totalCarbs)}g logged ({Math.round((totalCarbs / Math.max(1, goals.macroTargets.carbsGramsTarget)) * 100)}%)</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-obsidian-900 border border-purple-500/20">
                  <span className="text-[10px] text-slate-400 block font-bold">Healthy Fats ({goals.macroTargets.fatCaloriesPct}%)</span>
                  <span className="text-sm font-black text-cyan-500">{goals.macroTargets.fatGramsTarget}g</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">{Math.round(totalFat)}g logged ({Math.round((totalFat / Math.max(1, goals.macroTargets.fatGramsTarget)) * 100)}%)</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-obsidian-900 border border-purple-500/20">
                  <span className="text-[10px] text-slate-400 block font-bold">Fiber (IOM Std)</span>
                  <span className="text-sm font-black text-emerald-500">{goals.macroTargets.fiberGramsTarget}g</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">{Math.round(totalFiber)}g logged ({Math.round((totalFiber / Math.max(1, goals.macroTargets.fiberGramsTarget)) * 100)}%)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PHYSICAL ACTIVITY & WHO PROTOCOL */}
          {activeTab === 'activity' && (
            <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>WHO Physical Activity & Step Volume Targets</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">
                  Cardiovascular Protection
                </span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-white dark:bg-obsidian-900 border border-amber-500/20">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Daily Steps Goal</span>
                  <span className="text-base font-black text-amber-500">{goals.activityGoals.dailyStepGoal.toLocaleString()}</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">{activity.steps.toLocaleString()} logged ({stepPct}%)</span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-obsidian-900 border border-amber-500/20">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Minutes Goal</span>
                  <span className="text-base font-black text-emerald-500">{goals.activityGoals.dailyExerciseMinutesGoal} mins</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">{activity.activeMinutes}m logged ({exercisePct}%)</span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-obsidian-900 border border-amber-500/20">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Calories Burn Goal</span>
                  <span className="text-base font-black text-orange-500">{goals.activityGoals.dailyActiveCalorieGoal} kcal</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">{activity.activeCaloriesBurned} kcal burned</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                JAMA 2021 clinical trials confirm that achieving <strong>7,500 to 10,000 steps daily</strong> combined with 150–300 minutes of weekly moderate aerobic activity decreases all-cause cardiovascular mortality by up to 50%.
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
