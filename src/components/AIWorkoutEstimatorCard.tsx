import React, { useState } from 'react';
import { 
  Sparkles, 
  Flame, 
  Clock, 
  Dumbbell, 
  Check, 
  AlertCircle, 
  Droplet, 
  ChevronRight, 
  Send,
  Loader2,
  Info
} from 'lucide-react';
import { UserProfile, WorkoutLog, DailyActivityLog } from '../types';
import { 
  estimateWorkoutFromNaturalLanguage, 
  AIWorkoutEstimate 
} from '../services/aiWorkoutService';
import { saveWorkoutLogWithCache, updateDailyActivity } from '../services/db';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface AIWorkoutEstimatorCardProps {
  profile: UserProfile;
  selectedDate: string;
  activity?: DailyActivityLog;
  onWorkoutLogged?: (workout: WorkoutLog) => void;
  onActivityUpdated?: (act: DailyActivityLog) => void;
}

export const AIWorkoutEstimatorCard: React.FC<AIWorkoutEstimatorCardProps> = ({
  profile,
  selectedDate,
  activity,
  onWorkoutLogged,
  onActivityUpdated,
}) => {
  const [workoutSummary, setWorkoutSummary] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [estimate, setEstimate] = useState<AIWorkoutEstimate | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const samplePrompts = [
    'Ran 4km on treadmill in 25 mins, then 15 mins dumbbell curls & pushups',
    '45 mins outdoor cycling at moderate pace + 10 min core plank circuit',
    '30 mins HIIT bodyweight workout with burpees, jumping jacks & lunges',
    '40 mins gentle vinyasa yoga and full-body stretching'
  ];

  const handleAnalyze = async (textToAnalyze?: string) => {
    const text = (textToAnalyze || workoutSummary).trim();
    if (!text) {
      setErrorMsg('Please describe your workout first.');
      return;
    }

    setErrorMsg(null);
    setIsAnalyzing(true);
    setEstimate(null);
    setSavedSuccess(false);
    soundFx.playTap();
    triggerHaptic();

    try {
      const result = await estimateWorkoutFromNaturalLanguage(text, profile);
      setEstimate(result);
      soundFx.playSuccessChime();
    } catch (err: any) {
      console.error('Error estimating workout:', err);
      setErrorMsg(err?.message || 'Could not analyze workout description. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogEstimatedWorkout = async () => {
    if (!estimate) return;
    setIsSaving(true);
    soundFx.playRingCelebration();
    triggerHaptic();

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newWorkout: WorkoutLog = {
      id: `ai-workout-${Date.now()}`,
      userId: profile.id,
      date: selectedDate,
      time: timeStr,
      type: estimate.workoutType,
      title: estimate.title,
      durationMinutes: estimate.totalDurationMinutes,
      caloriesBurned: estimate.totalCaloriesBurned,
      intensity: estimate.intensity,
      notes: `${workoutSummary}\n\n[AI Estimates: ${estimate.breakdown.map(b => `${b.name}: ${b.caloriesBurned} kcal`).join(', ')}]`,
      source: 'manual',
      createdAt: new Date().toISOString()
    };

    try {
      await saveWorkoutLogWithCache(newWorkout);

      if (activity) {
        const updatedAct = await updateDailyActivity(profile.id, selectedDate, {
          activeMinutes: (activity.activeMinutes || 0) + estimate.totalDurationMinutes,
          activeCaloriesBurned: (activity.activeCaloriesBurned || 0) + estimate.totalCaloriesBurned,
        });
        if (onActivityUpdated) onActivityUpdated(updatedAct);
      }

      if (onWorkoutLogged) onWorkoutLogged(newWorkout);

      setSavedSuccess(true);
      setTimeout(() => {
        setEstimate(null);
        setWorkoutSummary('');
        setSavedSuccess(false);
      }, 3500);
    } catch (err) {
      console.error('Failed to save workout:', err);
      setErrorMsg('Failed to save workout. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-obsidian-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden transition-all">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md shadow-emerald-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-white dark:bg-obsidian-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>AI Workout Calorie Estimator</span>
              <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                Natural Language
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Describe your workout in your own words — AI calculates exact calories based on your {profile.weightKg}kg body weight & MET values
            </p>
          </div>
        </div>
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
          Try:
        </span>
        {samplePrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setWorkoutSummary(prompt);
              handleAnalyze(prompt);
            }}
            className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-obsidian-800 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-600 dark:text-slate-300 whitespace-nowrap transition border border-slate-200/60 dark:border-slate-800"
          >
            "{prompt.slice(0, 32)}..."
          </button>
        ))}
      </div>

      {/* Input Box Area */}
      <form onSubmit={(e) => { e.preventDefault(); handleAnalyze(); }} className="space-y-3">
        <div className="relative">
          <textarea
            value={workoutSummary}
            onChange={(e) => setWorkoutSummary(e.target.value)}
            placeholder="Type or paste your workout summary (e.g. 'I jogged on the treadmill for 30 minutes at 8 km/h, did 3 sets of 15 pushups, and 10 mins of abdominal planks')..."
            rows={3}
            className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition resize-none"
          />
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Calibrated with ACSM (American College of Sports Medicine) MET coefficients
          </span>

          <button
            type="submit"
            disabled={isAnalyzing || !workoutSummary.trim()}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition flex items-center gap-2 disabled:opacity-50 active:scale-95"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Calculating Calories...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyze with AI</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* AI ESTIMATE RESULT CARD */}
      {estimate && (
        <div className="mt-4 p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-4 animate-fade-in">
          
          {/* Header Metric Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Exercise Identified
              </span>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                {estimate.title}
              </h4>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-baseline gap-1 text-right">
                <span className="text-2xl font-black text-emerald-500">
                  {estimate.totalCaloriesBurned}
                </span>
                <span className="text-xs text-slate-400 font-bold">kcal burned</span>
              </div>

              <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />

              <div className="flex items-baseline gap-1 text-right">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {estimate.totalDurationMinutes}
                </span>
                <span className="text-xs text-slate-400 font-bold">mins</span>
              </div>
            </div>
          </div>

          {/* Exercise Breakdown List */}
          {estimate.breakdown.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Component Breakdown & Energy Output:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {estimate.breakdown.map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-2.5 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{item.name}</span>
                      <span className="text-[10px] text-slate-400">{item.durationMinutes} mins • {item.metValue} MET</span>
                    </div>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      +{item.caloriesBurned} kcal
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clinical Insights & Hydration Recommendation */}
          <div className="p-3 rounded-xl bg-white/80 dark:bg-obsidian-950/80 border border-emerald-500/20 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
            <p className="leading-relaxed">
              <strong>Clinical Assessment:</strong> {estimate.clinicalInsights}
            </p>
            <p className="text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-1.5 text-[11px]">
              <Droplet className="w-3.5 h-3.5 shrink-0" />
              <span>Hydration sweat compensation: Recommended <strong>+{estimate.suggestedHydrationBoostMl} ml</strong> fluid intake today.</span>
            </p>
          </div>

          {/* Action Button: Log directly into day */}
          <div className="flex items-center justify-between pt-1">
            {savedSuccess ? (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
                <Check className="w-4 h-4" />
                <span>Workout Logged & Active Calories Updated!</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">
                Will be added to your workout diary for {selectedDate}
              </span>
            )}

            <button
              type="button"
              onClick={handleLogEstimatedWorkout}
              disabled={isSaving || savedSuccess}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Recorded!</span>
                </>
              ) : (
                <>
                  <Dumbbell className="w-4 h-4" />
                  <span>Log This Workout</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
