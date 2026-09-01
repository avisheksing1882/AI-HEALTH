import React from 'react';
import { Dumbbell, Plus, Trash2, Heart, Clock, Flame, MapPin, Play, Timer, Sparkles, ShieldCheck, HeartPulse } from 'lucide-react';
import { WorkoutLog, DailyActivityLog, UserProfile } from '../types';
import { ActivityRings } from './ActivityRings';
import { StepTrackerCard } from './StepTrackerCard';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface WorkoutsViewProps {
  workouts: WorkoutLog[];
  activity: DailyActivityLog;
  profile: UserProfile;
  onOpenWorkoutModal: () => void;
  onDeleteWorkout: (id: string) => void;
  onActivityUpdated: (act: DailyActivityLog) => void;
}

export const WorkoutsView: React.FC<WorkoutsViewProps> = ({
  workouts,
  activity,
  profile,
  onOpenWorkoutModal,
  onDeleteWorkout,
  onActivityUpdated,
}) => {
  const totalWorkoutMinutes = workouts.reduce((s, w) => s + w.durationMinutes, 0);
  const totalWorkoutCalories = workouts.reduce((s, w) => s + w.caloriesBurned, 0);
  const conditions = profile.healthConditions || [];

  const getWorkoutIcon = (type: string) => {
    switch (type) {
      case 'running': return '🏃‍♂️';
      case 'cycling': return '🚴‍♂️';
      case 'gym_strength': return '🏋️‍♂️';
      case 'yoga': return '🧘‍♀️';
      case 'hiit': return '⚡';
      case 'swimming': return '🏊‍♂️';
      case 'pilates': return '🤸‍♀️';
      default: return '🚶‍♂️';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            Activity & Exercise Tracking
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time pedometer, active calories, and multi-sport workout recording
          </p>
        </div>

        <button
          onClick={() => { soundFx.playTap(); onOpenWorkoutModal(); }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Record Workout</span>
        </button>
      </div>

      {/* Health Conditions Clinical Directives Alert */}
      {conditions.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-teal-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  Clinical Training Protocol Active
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  {conditions.length} Condition{conditions.length > 1 ? 's' : ''} Linked
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                {conditions.includes('knee_pain') && '🦵 Knee-safe low-impact workouts prioritized (cycling, swimming, walking). '}
                {conditions.includes('back_pain') && '🦴 Core & spinal stabilization emphasized. '}
                {conditions.includes('pcos_pcod') && '🌸 Steady aerobic + resistance training for insulin sensitivity. '}
                {conditions.includes('thyroid') && '🦋 Metabolism-stimulating balanced cardio & strength protocols.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Activity Rings & Summary Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Apple Health 3-Ring Visualizer */}
        <div className="bg-white dark:bg-obsidian-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
          <ActivityRings
            moveCalories={activity.activeCaloriesBurned}
            moveGoal={activity.stepGoal * 0.05} // approximate active calorie target
            exerciseMinutes={activity.activeMinutes}
            exerciseGoal={profile.dailyExerciseMinutesGoal}
            steps={activity.steps}
            stepGoal={activity.stepGoal}
            size={220}
            strokeWidth={16}
          />
        </div>

        {/* Step Tracker Card */}
        <div className="lg:col-span-2">
          <StepTrackerCard
            activity={activity}
            profile={profile}
            onActivityUpdated={onActivityUpdated}
          />
        </div>

      </div>

      {/* Logged Workouts List */}
      <div className="bg-white dark:bg-obsidian-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Today's Workout Sessions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {workouts.length} sessions &bull; {totalWorkoutMinutes} mins total &bull; {totalWorkoutCalories} kcal burned
              </p>
            </div>
          </div>
        </div>

        {workouts.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-slate-50 dark:bg-obsidian-950/60 border border-dashed border-slate-200 dark:border-slate-800">
            <Dumbbell className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No Workouts Logged Yet
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Hit the gym, go for a run, or start a yoga flow. Log your workout to close your exercise ring!
            </p>
            <button
              onClick={() => { soundFx.playTap(); onOpenWorkoutModal(); }}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Start Workout
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {workouts.map((workout) => (
              <div
                key={workout.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-obsidian-950/70 border border-slate-200/80 dark:border-slate-800/80 flex items-start justify-between gap-3 hover:border-emerald-500/40 transition"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getWorkoutIcon(workout.type)}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {workout.title}
                      </h4>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 capitalize font-semibold">
                        {workout.intensity}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-500" /> {workout.durationMinutes} mins
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" /> {workout.caloriesBurned} kcal
                      </span>
                      {workout.distanceKm && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-500" /> {workout.distanceKm} km
                        </span>
                      )}
                      {workout.avgHeartRate && (
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-500" /> {workout.avgHeartRate} bpm
                        </span>
                      )}
                    </div>

                    {workout.notes && (
                      <p className="text-[11px] text-slate-400 italic mt-1.5">
                        "{workout.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    soundFx.playTap();
                    triggerHaptic();
                    onDeleteWorkout(workout.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition shrink-0"
                  title="Delete workout"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
};
