import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  CartesianGrid, 
  ReferenceLine,
  Legend
} from 'recharts';
import { TrendingUp, Flame, Footprints, Award, Scale, Calendar, Utensils } from 'lucide-react';
import { DailyActivityLog, MealLog, UserProfile, WeightLog, WorkoutLog } from '../types';
import { db } from '../services/db';
import { calculateWeeklyWeightAnalysis } from '../services/nutritionCalculator';
import { soundFx } from '../services/soundEffects';

interface AnalyticsViewProps {
  profile: UserProfile;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ profile }) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [activities, setActivities] = useState<DailyActivityLog[]>([]);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange, profile.id]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    const dayCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const userId = profile.id;
    
    const userActivities = await db.dailyActivity
      .where('userId')
      .equals(userId)
      .sortBy('date');

    const sortedActivities = userActivities.slice(-dayCount);

    const userMeals = await db.meals.where('userId').equals(userId).toArray();
    const userWeights = await db.weightLogs.where('userId').equals(userId).sortBy('date');
    const userWorkouts = await db.workouts.where('userId').equals(userId).toArray();

    setActivities(sortedActivities);
    setMeals(userMeals);
    setWeights(userWeights);
    setWorkouts(userWorkouts);
    setIsLoading(false);
  };

  // Compute Aggregates
  const totalDays = Math.max(1, activities.length);
  const avgSteps = Math.round(activities.reduce((s, a) => s + a.steps, 0) / totalDays);
  const avgActiveKcal = Math.round(activities.reduce((s, a) => s + a.activeCaloriesBurned, 0) / totalDays);
  const goalsMetCount = activities.filter(a => a.isGoalMet).length;
  const consistencyPct = Math.round((goalsMetCount / totalDays) * 100);

  // Prepare Chart Data
  const chartData = activities.map(act => {
    const dayMeals = meals.filter(m => m.date === act.date);
    const dayKcalIn = dayMeals.reduce((s, m) => s + m.totalCalories, 0);
    const dayProtein = dayMeals.reduce((s, m) => s + m.totalProtein, 0);
    const dayCarbs = dayMeals.reduce((s, m) => s + m.totalCarbs, 0);
    const dayFat = dayMeals.reduce((s, m) => s + m.totalFat, 0);

    const d = new Date(act.date + 'T00:00:00');
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

    return {
      date: act.date,
      label,
      steps: act.steps,
      stepGoal: act.stepGoal,
      kcalIn: dayKcalIn,
      kcalOut: act.totalCaloriesBurned,
      activeKcal: act.activeCaloriesBurned,
      protein: dayProtein,
      carbs: dayCarbs,
      fat: dayFat,
      weightKg: act.weightKg || profile.weightKg
    };
  });

  // Weight Trend Chart Data
  const weightChartData = weights.map(w => {
    const d = new Date(w.date + 'T00:00:00');
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      date: w.date,
      label,
      weight: w.weightKg,
    };
  });

  return (
    <div className="space-y-6">
      
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            Trends & Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Holistic insights into your daily movement, caloric deficit, and body composition
          </p>
        </div>

        {/* Time Range Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-obsidian-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold self-start sm:self-auto">
          {(['7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              onClick={() => { soundFx.playTap(); setTimeRange(range); }}
              className={`px-3.5 py-1.5 rounded-xl transition ${
                timeRange === range
                  ? 'bg-white dark:bg-obsidian-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="bg-white dark:bg-obsidian-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-cyan-500 mb-1">
            <Footprints className="w-4 h-4" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg Daily Steps</span>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white block mt-1">
            {avgSteps.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Goal: {profile.dailyStepGoal.toLocaleString()}</span>
        </div>

        <div className="bg-white dark:bg-obsidian-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-orange-500 mb-1">
            <Flame className="w-4 h-4" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg Active Burn</span>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white block mt-1">
            {avgActiveKcal} <span className="text-xs font-normal text-slate-400">kcal/day</span>
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Exercise & walking</span>
        </div>

        <div className="bg-white dark:bg-obsidian-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <Award className="w-4 h-4" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Consistency Rate</span>
          </div>
          <span className="text-2xl font-black text-emerald-500 block mt-1">
            {consistencyPct}%
          </span>
          <span className="text-[10px] text-slate-500 font-medium">{goalsMetCount} / {totalDays} days goal met</span>
        </div>

        <div className="bg-white dark:bg-obsidian-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-purple-500 mb-1">
            <Scale className="w-4 h-4" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Current Weight</span>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white block mt-1">
            {profile.weightKg} <span className="text-xs font-normal text-slate-400">kg</span>
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Target: {profile.targetWeightKg} kg</span>
        </div>

      </div>

      {/* Chart 1: Step Volume & Goal */}
      <div className="bg-white dark:bg-obsidian-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Daily Step Cadence & Consistency
            </h3>
            <p className="text-xs text-slate-500">Green bars indicate step goal was met</p>
          </div>
          <span className="text-xs font-semibold text-cyan-500">Daily Target: {profile.dailyStepGoal.toLocaleString()}</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <ReferenceLine y={profile.dailyStepGoal} stroke="#06B6D4" strokeDasharray="3 3" label={{ value: 'Goal', fill: '#06B6D4', fontSize: 10 }} />
              <Bar
                dataKey="steps"
                radius={[6, 6, 0, 0]}
                fill="#10B981"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Energy Intake vs Burn (Caloric Balance) */}
      <div className="bg-white dark:bg-obsidian-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Energy Balance (Intake vs Total Outlay)
            </h3>
            <p className="text-xs text-slate-500">Comparing calories consumed against total metabolic burn</p>
          </div>
          <span className="text-xs font-semibold text-emerald-500">Mifflin-St Jeor Formula</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Area type="monotone" name="Food Eaten (kcal)" dataKey="kcalIn" stroke="#F97316" fillOpacity={1} fill="url(#colorIn)" />
              <Area type="monotone" name="Total Burned (kcal)" dataKey="kcalOut" stroke="#10B981" fillOpacity={1} fill="url(#colorOut)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: Macronutrient Distribution History */}
      <div className="bg-white dark:bg-obsidian-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Macronutrient Consumption History
            </h3>
            <p className="text-xs text-slate-500">Daily breakdown of Protein, Carbohydrates, and Fats (grams)</p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar name="Protein (g)" dataKey="protein" stackId="a" fill="#6366F1" radius={[0, 0, 0, 0]} />
              <Bar name="Carbs (g)" dataKey="carbs" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
              <Bar name="Fats (g)" dataKey="fat" stackId="a" fill="#EC4899" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 4: 7-Day Compiled Weight Trend & Progress Forecast */}
      {weights.length >= 1 && (() => {
        const analysis = calculateWeeklyWeightAnalysis(weights, profile.weightKg, profile.targetWeightKg);
        return (
          <div className="bg-white dark:bg-obsidian-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    7-Day Weight Progress & Trend Forecast
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    7-Day Compiled
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Current: {analysis.lastWeightKg} kg &middot; Target Goal: {profile.targetWeightKg} kg
                </p>
              </div>

              {/* 7-Day Change Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold">
                  {analysis.weeklyRateKgPerWeek !== 0 ? (
                    <span>{analysis.weeklyRateKgPerWeek > 0 ? '+' : ''}{analysis.weeklyRateKgPerWeek} kg/week</span>
                  ) : (
                    <span>Stable Pace</span>
                  )}
                </div>

                {analysis.projectedGoalDate && (
                  <div className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                    <span>🎯 Goal: {analysis.projectedGoalDate}</span>
                  </div>
                )}
              </div>
            </div>

            {weightChartData.length >= 2 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} />
                    <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 11, fill: '#888' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)} kg`, 'Weight']}
                    />
                    <ReferenceLine
                      y={profile.targetWeightKg}
                      stroke="#10B981"
                      strokeDasharray="5 5"
                      label={{ value: `Target ${profile.targetWeightKg}kg`, fill: '#10B981', fontSize: 10, position: 'left' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      name="Weight (kg)"
                      stroke="#8B5CF6"
                      strokeWidth={2.5}
                      dot={{ fill: '#8B5CF6', r: 5 }}
                      activeDot={{ r: 7, fill: '#A78BFA' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-obsidian-950 text-center text-xs text-slate-400">
                1 weigh-in recorded ({analysis.lastWeightKg} kg). Log your weight every 7 days to compile a continuous trajectory curve.
              </div>
            )}
          </div>
        );
      })()}

      {/* Empty State — if no analytics data at all */}
      {!isLoading && activities.length === 0 && (
        <div className="bg-white dark:bg-obsidian-900 p-12 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No Data Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Start tracking your steps, meals, and workouts to see rich trend analytics appear here.
          </p>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white dark:bg-obsidian-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm animate-pulse">
              <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
              <div className="h-56 bg-slate-100 dark:bg-obsidian-950 rounded-2xl" />
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
