import React, { useState } from 'react';
import { 
  X, 
  User, 
  Sparkles, 
  Check, 
  Volume2, 
  VolumeX, 
  Download, 
  ShieldCheck,
  Flame,
  Target,
  Trash2,
  LogOut,
  Mail
} from 'lucide-react';
import { ActivityLevel, FitnessGoal, Gender, UserProfile } from '../types';
import { calculateBMR, calculateCalorieTarget, calculateMacroTargets, calculateTDEE } from '../services/nutritionCalculator';
import { db, saveUserProfile } from '../services/db';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  onLogout: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
  onLogout
}) => {
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age);
  const [gender, setGender] = useState<Gender>(profile.gender);
  const [heightCm, setHeightCm] = useState(profile.heightCm);
  const [weightKg, setWeightKg] = useState(profile.weightKg);
  const [targetWeightKg, setTargetWeightKg] = useState(profile.targetWeightKg);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel);
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>(profile.fitnessGoal);
  const [dailyStepGoal, setDailyStepGoal] = useState(profile.dailyStepGoal);
  const [dailyWaterGoalMl, setDailyWaterGoalMl] = useState(profile.dailyWaterGoalMl);
  const [soundEnabled, setSoundEnabled] = useState(profile.soundEnabled);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  // Live recalculated BMR, TDEE, and targets
  const liveBmr = calculateBMR(weightKg, heightCm, age, gender);
  const liveTdee = calculateTDEE(liveBmr, activityLevel);
  const liveCalorieTarget = calculateCalorieTarget(liveTdee, fitnessGoal, gender);
  const liveMacros = calculateMacroTargets(liveCalorieTarget, weightKg, fitnessGoal);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playRingCelebration();
    triggerHaptic();

    soundFx.setMuted(!soundEnabled);

    const updated = await saveUserProfile(profile.id, {
      name: name.trim(),
      age,
      gender,
      heightCm,
      weightKg,
      targetWeightKg,
      activityLevel,
      fitnessGoal,
      dailyStepGoal,
      dailyWaterGoalMl,
      bmr: liveBmr,
      tdee: liveTdee,
      calorieTarget: liveCalorieTarget,
      proteinGramsTarget: liveMacros.proteinGramsTarget,
      carbsGramsTarget: liveMacros.carbsGramsTarget,
      fatGramsTarget: liveMacros.fatGramsTarget,
      fiberGramsTarget: liveMacros.fiberGramsTarget,
      soundEnabled,
    });

    onProfileUpdated(updated);
    onClose();
  };

  const handleExportData = async () => {
    soundFx.playTap();
    const userId = profile.id;
    const allActivities = await db.dailyActivity.where('userId').equals(userId).toArray();
    const allMeals = await db.meals.where('userId').equals(userId).toArray();
    const allWorkouts = await db.workouts.where('userId').equals(userId).toArray();
    const allWeights = await db.weightLogs.where('userId').equals(userId).toArray();
    const allCorrections = await db.learnedCorrections.where('userId').equals(userId).toArray();

    const backup = {
      profile,
      activities: allActivities,
      meals: allMeals,
      workouts: allWorkouts,
      weights: allWeights,
      corrections: allCorrections,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vitaltrack-export-${profile.email}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearMyData = async () => {
    if (!window.confirm('Are you sure you want to delete all your tracked meals, workouts, and steps? This action cannot be undone.')) {
      return;
    }
    setIsDeleting(true);
    const userId = profile.id;
    await db.meals.where('userId').equals(userId).delete();
    await db.workouts.where('userId').equals(userId).delete();
    await db.dailyActivity.where('userId').equals(userId).delete();
    await db.weightLogs.where('userId').equals(userId).delete();
    await db.waterLogs.where('userId').equals(userId).delete();
    setIsDeleting(false);
    onClose();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <User className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Profile & Health Settings
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Mail className="w-3.5 h-3.5 text-emerald-500" />
                <span>{profile.email}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 font-semibold ml-1">
                  Google Verified
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => { soundFx.playTap(); onClose(); }}
            className="p-2 rounded-xl bg-slate-100 dark:bg-obsidian-800 hover:bg-slate-200 dark:hover:bg-obsidian-700 text-slate-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Metabolic Summary Card */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-transparent p-5 rounded-2xl border border-emerald-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Live Metabolic Formula (Mifflin-St Jeor)
            </span>
            <span className="text-[11px] font-semibold text-slate-500">Auto-Calculated</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white/60 dark:bg-obsidian-950/60 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 block font-semibold">BMR</span>
              <span className="text-base font-black text-slate-800 dark:text-slate-100">{liveBmr}</span>
              <span className="text-[9px] text-slate-400 block">kcal/day</span>
            </div>
            <div className="bg-white/60 dark:bg-obsidian-950/60 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 block font-semibold">TDEE</span>
              <span className="text-base font-black text-slate-800 dark:text-slate-100">{liveTdee}</span>
              <span className="text-[9px] text-slate-400 block">kcal/day</span>
            </div>
            <div className="bg-white/60 dark:bg-obsidian-950/60 p-2.5 rounded-xl border border-emerald-500/30">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">Daily Calorie Target</span>
              <span className="text-base font-black text-emerald-500">{liveCalorieTarget}</span>
              <span className="text-[9px] text-slate-400 block">kcal target</span>
            </div>
            <div className="bg-white/60 dark:bg-obsidian-950/60 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
              <span className="text-[10px] text-indigo-500 block font-semibold">Protein Target</span>
              <span className="text-base font-black text-indigo-500">{liveMacros.proteinGramsTarget}g</span>
              <span className="text-[9px] text-slate-400 block">daily</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          
          {/* Biometrics */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Biometrics & Physical Stats
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Biological Sex</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Age (years)</label>
                <input
                  type="number"
                  value={age}
                  min={12}
                  max={100}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={heightCm}
                  min={100}
                  max={250}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Current Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weightKg}
                  min={30}
                  max={300}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Target Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={targetWeightKg}
                  min={30}
                  max={300}
                  onChange={(e) => setTargetWeightKg(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Goals & Activity Level */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Lifestyle & Health Goal
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Activity Level</label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                >
                  <option value="sedentary">Sedentary (Little or no exercise)</option>
                  <option value="light">Lightly Active (1-3 days/week)</option>
                  <option value="moderate">Moderately Active (3-5 days/week)</option>
                  <option value="very_active">Very Active (6-7 days/week)</option>
                  <option value="extra_active">Extra Active (Intense training / Physical job)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Fitness Goal</label>
                <select
                  value={fitnessGoal}
                  onChange={(e) => setFitnessGoal(e.target.value as FitnessGoal)}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                >
                  <option value="lose_fast">Aggressive Fat Loss (-20% Calorie Deficit)</option>
                  <option value="lose_moderate">Moderate Fat Loss (-15% Deficit, Recommended)</option>
                  <option value="maintain">Maintain Weight & Recompose (0% Deficit)</option>
                  <option value="gain_lean">Lean Muscle Gain (+10% Surplus)</option>
                  <option value="gain_mass">Mass & Strength Building (+15% Surplus)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Daily Step Target</label>
                <input
                  type="number"
                  step="500"
                  value={dailyStepGoal}
                  min={1000}
                  max={50000}
                  onChange={(e) => setDailyStepGoal(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Daily Hydration Target (ml)</label>
                <input
                  type="number"
                  step="250"
                  value={dailyWaterGoalMl}
                  min={500}
                  max={8000}
                  onChange={(e) => setDailyWaterGoalMl(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Audio & Haptic Controls */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-500" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Sound Effects & Haptics</span>
                <span className="text-[10px] text-slate-400">Tactile clicks, camera shutter, ring completion audio</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { soundFx.playTap(); setSoundEnabled(!soundEnabled); }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                soundEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-obsidian-800 text-slate-500'
              }`}
            >
              {soundEnabled ? 'Enabled' : 'Muted'}
            </button>
          </div>

          {/* Account Actions & Data Management */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-obsidian-950 hover:bg-slate-200 dark:hover:bg-obsidian-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Backup My Data (JSON)
                </button>

                <button
                  type="button"
                  onClick={handleClearMyData}
                  disabled={isDeleting}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear My Data
                </button>
              </div>

              <button
                type="button"
                onClick={() => { soundFx.playTap(); onLogout(); }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out ({profile.email})
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => { soundFx.playTap(); onClose(); }}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-obsidian-800 hover:bg-slate-200 dark:hover:bg-obsidian-700 text-slate-700 dark:text-slate-300 text-sm font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
            >
              <Check className="w-4 h-4" />
              Save Profile
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
