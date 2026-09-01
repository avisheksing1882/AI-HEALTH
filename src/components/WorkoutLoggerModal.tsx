import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Dumbbell, 
  Play, 
  Pause, 
  Square, 
  Flame, 
  Heart, 
  Timer, 
  Check, 
  Activity,
  Plus
} from 'lucide-react';
import { UserProfile, WorkoutLog, WorkoutType } from '../types';
import { calculateWorkoutCalories } from '../services/nutritionCalculator';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface WorkoutLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkoutSaved: (workout: WorkoutLog) => void;
  selectedDate: string;
  profile: UserProfile;
}

const WORKOUT_TYPES: { id: WorkoutType; label: string; icon: string; defaultIntensity: 'light' | 'moderate' | 'vigorous' }[] = [
  { id: 'walking', label: 'Brisk Walk', icon: '🚶‍♂️', defaultIntensity: 'light' },
  { id: 'running', label: 'Outdoor Run', icon: '🏃‍♂️', defaultIntensity: 'vigorous' },
  { id: 'cycling', label: 'Cycling', icon: '🚴‍♂️', defaultIntensity: 'moderate' },
  { id: 'gym_strength', label: 'Gym & Strength', icon: '🏋️‍♂️', defaultIntensity: 'moderate' },
  { id: 'yoga', label: 'Yoga & Flow', icon: '🧘‍♀️', defaultIntensity: 'light' },
  { id: 'hiit', label: 'HIIT Circuit', icon: '⚡', defaultIntensity: 'vigorous' },
  { id: 'swimming', label: 'Swimming', icon: '🏊‍♂️', defaultIntensity: 'vigorous' },
  { id: 'pilates', label: 'Pilates & Core', icon: '🤸‍♀️', defaultIntensity: 'moderate' },
  { id: 'sports', label: 'Badminton / Sports', icon: '🏸', defaultIntensity: 'vigorous' },
];

export const WorkoutLoggerModal: React.FC<WorkoutLoggerModalProps> = ({
  isOpen,
  onClose,
  onWorkoutSaved,
  selectedDate,
  profile,
}) => {
  const [tab, setTab] = useState<'live' | 'manual'>('live');
  const [selectedType, setSelectedType] = useState<WorkoutType>('gym_strength');
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'vigorous' | 'extreme'>('moderate');
  const [title, setTitle] = useState('Gym Strength Training');
  const [notes, setNotes] = useState('');

  // Live Timer states
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [liveCalories, setLiveCalories] = useState(0);
  const [liveHeartRate, setLiveHeartRate] = useState(128);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Manual states
  const [manualDuration, setManualDuration] = useState(45);
  const [manualDistance, setManualDistance] = useState<number | undefined>(undefined);
  const [manualCalories, setManualCalories] = useState(250);

  useEffect(() => {
    if (isOpen) {
      updateManualCalories(selectedType, manualDuration, intensity);
    } else {
      resetLiveTimer();
    }
  }, [isOpen, selectedType, manualDuration, intensity]);

  // Live timer tick
  useEffect(() => {
    if (isLiveActive) {
      timerRef.current = setInterval(() => {
        setSecondsElapsed(prev => {
          const next = prev + 1;
          // Calculate live calories burned
          const mins = next / 60;
          const kcal = calculateWorkoutCalories(selectedType, mins, profile.weightKg, intensity);
          setLiveCalories(kcal);

          // Simulate organic heart rate
          const baseHR = intensity === 'light' ? 105 : intensity === 'moderate' ? 130 : intensity === 'vigorous' ? 155 : 170;
          setLiveHeartRate(Math.round(baseHR + Math.sin(next * 0.1) * 6 + (Math.random() * 4 - 2)));
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLiveActive, selectedType, intensity, profile.weightKg]);

  const resetLiveTimer = () => {
    setIsLiveActive(false);
    setSecondsElapsed(0);
    setLiveCalories(0);
  };

  const updateManualCalories = (t: WorkoutType, mins: number, int: 'light' | 'moderate' | 'vigorous' | 'extreme') => {
    const kcal = calculateWorkoutCalories(t, mins, profile.weightKg, int);
    setManualCalories(kcal);
  };

  const handleSelectWorkoutType = (type: WorkoutType) => {
    soundFx.playTap();
    setSelectedType(type);
    const item = WORKOUT_TYPES.find(w => w.id === type);
    if (item) {
      setTitle(item.label);
      setIntensity(item.defaultIntensity);
      updateManualCalories(type, manualDuration, item.defaultIntensity);
    }
  };

  const handleSaveLiveWorkout = () => {
    const durationMinutes = Math.max(1, Math.round(secondsElapsed / 60));
    saveWorkout(durationMinutes, liveCalories, liveHeartRate, 'live_tracker');
  };

  const handleSaveManualWorkout = () => {
    saveWorkout(manualDuration, manualCalories, undefined, 'manual');
  };

  const saveWorkout = (
    durationMins: number,
    calories: number,
    hr?: number,
    source: 'manual' | 'live_tracker' = 'manual'
  ) => {
    soundFx.playRingCelebration();
    triggerHaptic();

    const now = new Date();
    const workoutLog: WorkoutLog = {
      id: `workout-${Date.now()}`,
      userId: profile.id,
      date: selectedDate,
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      type: selectedType,
      title: title.trim() || 'Exercise Workout',
      durationMinutes: durationMins,
      caloriesBurned: calories,
      distanceKm: manualDistance,
      avgHeartRate: hr,
      intensity,
      notes: notes.trim() || undefined,
      source,
      createdAt: now.toISOString(),
    };

    onWorkoutSaved(workoutLog);
    resetLiveTimer();
    onClose();
  };

  const formatTimerDisplay = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-obsidian-900 w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-obsidian-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Workout & Activity Tracker
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live exercise stopwatch or manual workout logging
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

        {/* Tab switcher */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-xs font-bold">
            <button
              onClick={() => { soundFx.playTap(); setTab('live'); }}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
                tab === 'live'
                  ? 'bg-white dark:bg-obsidian-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Timer className="w-4 h-4" />
              <span>Live Workout Session</span>
            </button>

            <button
              onClick={() => { soundFx.playTap(); setTab('manual'); }}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
                tab === 'manual'
                  ? 'bg-white dark:bg-obsidian-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Log Past Workout</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Sport Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Select Activity:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {WORKOUT_TYPES.map(w => (
                <button
                  key={w.id}
                  onClick={() => handleSelectWorkoutType(w.id)}
                  className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 transition ${
                    selectedType === w.id
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'bg-slate-50 dark:bg-obsidian-950/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  <span className="text-lg">{w.icon}</span>
                  <span className="text-xs truncate">{w.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Intensity selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Intensity:
            </label>
            <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold">
              {(['light', 'moderate', 'vigorous', 'extreme'] as const).map(lvl => (
                <button
                  key={lvl}
                  onClick={() => {
                    soundFx.playTap();
                    setIntensity(lvl);
                    updateManualCalories(selectedType, manualDuration, lvl);
                  }}
                  className={`py-1.5 rounded-xl capitalize transition ${
                    intensity === lvl
                      ? 'bg-emerald-500 text-white font-bold shadow-sm'
                      : 'bg-slate-100 dark:bg-obsidian-950 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* LIVE WORKOUT TAB */}
          {tab === 'live' && (
            <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 text-center space-y-4 shadow-inner">
              
              {/* Big Stopwatch Timer */}
              <div className="space-y-1">
                <span className="text-5xl font-black font-mono tracking-tight text-white drop-shadow-sm">
                  {formatTimerDisplay(secondsElapsed)}
                </span>
                <span className="block text-[11px] uppercase tracking-widest text-emerald-400 font-bold">
                  {isLiveActive ? 'Recording Live Metrics...' : secondsElapsed > 0 ? 'Paused' : 'Ready to Start'}
                </span>
              </div>

              {/* Live Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-obsidian-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-center gap-3">
                  <Flame className="w-6 h-6 text-orange-500" />
                  <div className="text-left">
                    <span className="text-lg font-black">{liveCalories}</span>
                    <span className="text-[10px] text-slate-400 block -mt-1">Active kcal</span>
                  </div>
                </div>

                <div className="bg-obsidian-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-center gap-3">
                  <Heart className={`w-6 h-6 text-rose-500 ${isLiveActive ? 'animate-pulse' : ''}`} />
                  <div className="text-left">
                    <span className="text-lg font-black">{isLiveActive ? liveHeartRate : '--'}</span>
                    <span className="text-[10px] text-slate-400 block -mt-1">BPM Heart Rate</span>
                  </div>
                </div>
              </div>

              {/* Live Controls */}
              <div className="flex items-center justify-center gap-3 pt-2">
                {!isLiveActive ? (
                  <button
                    onClick={() => {
                      soundFx.playTap();
                      triggerHaptic();
                      setIsLiveActive(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/30 transition transform active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{secondsElapsed > 0 ? 'Resume Session' : 'Start Session'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      soundFx.playTap();
                      setIsLiveActive(false);
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-lg shadow-amber-500/30 transition transform active:scale-95"
                  >
                    <Pause className="w-4 h-4 fill-white" />
                    <span>Pause Session</span>
                  </button>
                )}

                {secondsElapsed > 10 && (
                  <button
                    onClick={handleSaveLiveWorkout}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-sm shadow-lg shadow-cyan-600/30 transition transform active:scale-95"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Finish & Save</span>
                  </button>
                )}
              </div>

            </div>
          )}

          {/* MANUAL LOG TAB */}
          {tab === 'manual' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Duration (Minutes):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={manualDuration}
                    onChange={(e) => {
                      const mins = Number(e.target.value);
                      setManualDuration(mins);
                      updateManualCalories(selectedType, mins, intensity);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Burn (kcal):
                  </label>
                  <input
                    type="number"
                    value={manualCalories}
                    onChange={(e) => setManualCalories(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-emerald-500"
                  />
                </div>
              </div>

              {(selectedType === 'running' || selectedType === 'walking' || selectedType === 'cycling') && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Distance (Kilometers - Optional):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 5.2"
                    value={manualDistance || ''}
                    onChange={(e) => setManualDistance(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Session Notes (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Felt great, progressive overload on squats"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between font-bold">
                <span>Calculated Active Burn:</span>
                <span className="text-base">{manualCalories} kcal</span>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-obsidian-950 flex items-center justify-between">
          <button
            onClick={() => { soundFx.playTap(); onClose(); }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-obsidian-800 transition"
          >
            Cancel
          </button>

          {tab === 'manual' && (
            <button
              onClick={handleSaveManualWorkout}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition transform active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Log {manualDuration} min Workout</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
