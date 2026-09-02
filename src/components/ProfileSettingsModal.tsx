import React, { useState, useEffect } from 'react';
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
  Mail,
  HeartPulse
} from 'lucide-react';
import { ActivityLevel, FitnessGoal, Gender, UserProfile, HealthCondition } from '../types';
import { calculateBMR, calculateCalorieTarget, calculateMacroTargets, calculateTDEE, calculateMedicallyAccurateHydration } from '../services/nutritionCalculator';
import { db, saveUserProfile } from '../services/db';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  onLogout: () => void;
}

interface ConditionOption {
  id: HealthCondition;
  name: string;
  emoji: string;
  description: string;
}

const AVAILABLE_HEALTH_CONDITIONS: ConditionOption[] = [
  {
    id: 'thyroid',
    name: 'Thyroid (Hypo/Hyper)',
    emoji: '🦋',
    description: 'BMR metabolic adaptation, selenium/zinc nutrient recommendations, and steady energy protocols.'
  },
  {
    id: 'pcos_pcod',
    name: 'PCOS / PCOD',
    emoji: '🌸',
    description: 'Low-glycemic anti-inflammatory carb balance, high protein satiety, and insulin stabilization.'
  },
  {
    id: 'knee_pain',
    name: 'Knee Pain / Joint Sensitivity',
    emoji: '🦵',
    description: 'Filters out high-impact jumps/squats; prioritizes joint-friendly walking, cycling & physiotherapy.'
  },
  {
    id: 'back_pain',
    name: 'Lower Back / Spinal Strain',
    emoji: '🦴',
    description: 'Focuses on posture & core stability (bird-dogs, bridges) avoiding heavy spinal compression.'
  },
  {
    id: 'diabetes_type2',
    name: 'Type 2 Diabetes / Pre-Diabetes',
    emoji: '🩸',
    description: 'Lowers glycemic load targets and reminds you for gentle post-meal glucose walks.'
  },
  {
    id: 'hypertension',
    name: 'Hypertension (High BP)',
    emoji: '🫀',
    description: 'DASH diet guidelines, low-sodium monitoring (<1,800mg) and potassium-rich food suggestions.'
  },
  {
    id: 'gerd_acidity',
    name: 'Acid Reflux / GERD',
    emoji: '🍋',
    description: 'Prevents late-night heavy meals and suggests soothing, alkaline digestive foods.'
  },
  {
    id: 'fatty_liver',
    name: 'Fatty Liver (NAFLD)',
    emoji: '🥑',
    description: 'Emphasizes antioxidant-rich cruciferous vegetables, whole grains, and minimal refined sugars.'
  }
];

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
  onLogout
}) => {
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState<number | ''>(profile.age);
  const [gender, setGender] = useState<Gender>(profile.gender);
  const [heightCm, setHeightCm] = useState<number | ''>(profile.heightCm);
  const [weightKg, setWeightKg] = useState<number | ''>(profile.weightKg);
  const [targetWeightKg, setTargetWeightKg] = useState<number | ''>(profile.targetWeightKg);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel);
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>(profile.fitnessGoal);
  const [healthConditions, setHealthConditions] = useState<HealthCondition[]>(profile.healthConditions || []);
  const [dailyStepGoal, setDailyStepGoal] = useState<number | ''>(profile.dailyStepGoal);
  const [dailyWaterGoalMl, setDailyWaterGoalMl] = useState<number | ''>(profile.dailyWaterGoalMl);
  const [workoutDaysPerWeek, setWorkoutDaysPerWeek] = useState<number | ''>(profile.workoutDaysPerWeek || 4);
  const [soundEnabled, setSoundEnabled] = useState(profile.soundEnabled);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state whenever modal opens or profile changes
  useEffect(() => {
    if (isOpen) {
      setName(profile.name);
      setAge(profile.age);
      setGender(profile.gender);
      setHeightCm(profile.heightCm);
      setWeightKg(profile.weightKg);
      setTargetWeightKg(profile.targetWeightKg);
      setActivityLevel(profile.activityLevel);
      setFitnessGoal(profile.fitnessGoal);
      setHealthConditions(profile.healthConditions || []);
      setDailyStepGoal(profile.dailyStepGoal);
      setDailyWaterGoalMl(profile.dailyWaterGoalMl);
      setWorkoutDaysPerWeek(profile.workoutDaysPerWeek || 4);
      setSoundEnabled(profile.soundEnabled);
    }
  }, [isOpen, profile]);

  // Clean numeric inputs: strips any leading zero before another digit (e.g. "068" -> 68, "025" -> 25)
  const cleanNumberInput = (rawVal: string, isFloat = false): number | '' => {
    if (rawVal === '') return '';
    // Strip leading zero when followed by a digit: e.g. "068" -> "68", "00" -> "0"
    let cleaned = rawVal;
    if (/^0[0-9]/.test(cleaned)) {
      cleaned = cleaned.replace(/^0+/, '');
      if (cleaned === '') cleaned = '0';
    }
    const num = isFloat ? parseFloat(cleaned) : parseInt(cleaned, 10);
    return isNaN(num) ? '' : num;
  };

  if (!isOpen) return null;

  // Numeric fallbacks for live calculations
  const numericWeight = typeof weightKg === 'number' && weightKg > 0 ? weightKg : profile.weightKg;
  const numericHeight = typeof heightCm === 'number' && heightCm > 0 ? heightCm : profile.heightCm;
  const numericAge = typeof age === 'number' && age > 0 ? age : profile.age;

  // Live recalculated BMR, TDEE, and targets
  const liveBmr = calculateBMR(numericWeight, numericHeight, numericAge, gender, healthConditions);
  const liveTdee = calculateTDEE(liveBmr, activityLevel);
  const liveCalorieTarget = calculateCalorieTarget(
    liveTdee,
    fitnessGoal,
    gender,
    liveBmr,
    numericWeight,
    numericHeight,
    healthConditions
  );
  const liveMacros = calculateMacroTargets(liveCalorieTarget, numericWeight, fitnessGoal, healthConditions);
  const liveHydration = calculateMedicallyAccurateHydration(numericWeight, gender, numericAge, activityLevel, 0, healthConditions);

  const toggleHealthCondition = (condId: HealthCondition) => {
    soundFx.playTap();
    triggerHaptic();
    if (healthConditions.includes(condId)) {
      setHealthConditions(healthConditions.filter(c => c !== condId));
    } else {
      setHealthConditions([...healthConditions, condId]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playRingCelebration();
    triggerHaptic();

    soundFx.setMuted(!soundEnabled);

    const finalAge = typeof age === 'number' && age > 0 ? age : profile.age;
    const finalHeight = typeof heightCm === 'number' && heightCm > 0 ? heightCm : profile.heightCm;
    const finalWeight = typeof weightKg === 'number' && weightKg > 0 ? weightKg : profile.weightKg;
    const finalTargetWeight = typeof targetWeightKg === 'number' && targetWeightKg > 0 ? targetWeightKg : profile.targetWeightKg;
    const finalStepGoal = typeof dailyStepGoal === 'number' && dailyStepGoal > 0 ? dailyStepGoal : profile.dailyStepGoal;
    const finalWaterGoal = typeof dailyWaterGoalMl === 'number' && dailyWaterGoalMl > 0 ? dailyWaterGoalMl : profile.dailyWaterGoalMl;
    const finalWorkoutDays = typeof workoutDaysPerWeek === 'number' && workoutDaysPerWeek > 0 ? workoutDaysPerWeek : (profile.workoutDaysPerWeek || 4);

    const updated = await saveUserProfile(profile.id, {
      name: name.trim(),
      age: finalAge,
      gender,
      heightCm: finalHeight,
      weightKg: finalWeight,
      targetWeightKg: finalTargetWeight,
      activityLevel,
      fitnessGoal,
      healthConditions,
      dailyStepGoal: finalStepGoal,
      dailyWaterGoalMl: finalWaterGoal,
      workoutDaysPerWeek: finalWorkoutDays,
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
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-white dark:bg-obsidian-950 rounded-[14px] flex items-center justify-center">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-emerald-500" />
                )}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Profile & Health Settings
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Mail className="w-3.5 h-3.5" />
                <span>{profile.email}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-obsidian-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">

          {/* Biometrics */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Biometrics & Body Composition
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Age</label>
                <input
                  type="number"
                  value={age}
                  min={12}
                  max={100}
                  placeholder="e.g. 28"
                  onChange={(e) => setAge(cleanNumberInput(e.target.value, false))}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Gender</label>
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
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={heightCm}
                  min={100}
                  max={250}
                  placeholder="e.g. 175"
                  onChange={(e) => setHeightCm(cleanNumberInput(e.target.value, false))}
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
                  placeholder="e.g. 70"
                  onChange={(e) => setWeightKg(cleanNumberInput(e.target.value, true))}
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
                  placeholder="e.g. 68"
                  onChange={(e) => setTargetWeightKg(cleanNumberInput(e.target.value, true))}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Health Conditions & Physical Considerations */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-obsidian-950/80 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-1.5">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Health Conditions & Medical Considerations
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              VitalTrack AI personalizes your clinical macro targets, food choices, and joint-friendly workout recommendations based on your selected conditions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {AVAILABLE_HEALTH_CONDITIONS.map((cond) => {
                const isSelected = healthConditions.includes(cond.id);
                return (
                  <button
                    key={cond.id}
                    type="button"
                    onClick={() => toggleHealthCondition(cond.id)}
                    className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'bg-white dark:bg-obsidian-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{cond.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                          {cond.name}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-extrabold shrink-0 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> ACTIVE
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block line-clamp-2 mt-0.5 leading-snug">
                        {cond.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goals & Activity Level */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Lifestyle & Targets
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Activity Level</label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                >
                  <option value="sedentary">Sedentary (Desk job / minimal exercise)</option>
                  <option value="light">Lightly Active (1-3 days/week exercise)</option>
                  <option value="moderate">Moderately Active (3-5 days/week exercise)</option>
                  <option value="very_active">Very Active (6-7 days/week intense training)</option>
                  <option value="extra_active">Extra Active (Athletic training / physical job)</option>
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
                  placeholder="e.g. 8000"
                  onChange={(e) => setDailyStepGoal(cleanNumberInput(e.target.value, false))}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Daily Hydration Target (ml)</label>
                  <button
                    type="button"
                    onClick={() => setDailyWaterGoalMl(liveHydration.totalRecommendedMl)}
                    className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold hover:underline"
                  >
                    Use Recommended ({liveHydration.totalRecommendedMl}ml)
                  </button>
                </div>
                <input
                  type="number"
                  step="50"
                  value={dailyWaterGoalMl}
                  min={1000}
                  max={6000}
                  placeholder="e.g. 3000"
                  onChange={(e) => setDailyWaterGoalMl(cleanNumberInput(e.target.value, false))}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  EFSA standard: 35ml/kg for {weightKg}kg = {liveHydration.baselineMl}ml base + adjustments
                </span>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Weekly Exercise Target ({workoutDaysPerWeek} Days / Week)
                </label>
                <select
                  value={workoutDaysPerWeek}
                  onChange={(e) => setWorkoutDaysPerWeek(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white font-medium"
                >
                  <option value={1}>1 Day / Week (Full Body Maintenance)</option>
                  <option value={2}>2 Days / Week (Full Body Split)</option>
                  <option value={3}>3 Days / Week (Push / Pull / Legs Split)</option>
                  <option value={4}>4 Days / Week (Upper / Lower Periodized Split)</option>
                  <option value={5}>5 Days / Week (Push / Pull / Legs / Upper / Lower)</option>
                  <option value={6}>6 Days / Week (High Performance PPL × 2)</option>
                  <option value={7}>7 Days / Week (Athletic + Active Recovery)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Determines your customized AI weekly exercise schedule and recovery distribution
                </span>
              </div>
            </div>
          </div>

          {/* AI Tailored Target Projection Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                Personalized Clinical Targets Calculated
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center pt-1">
              <div className="p-2 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block">Daily Budget</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">{liveCalorieTarget} kcal</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block">Protein</span>
                <span className="text-sm font-black text-emerald-500">{liveMacros.proteinGramsTarget}g</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block">Carbs</span>
                <span className="text-sm font-black text-amber-500">{liveMacros.carbsGramsTarget}g</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block">Healthy Fats</span>
                <span className="text-sm font-black text-cyan-500">{liveMacros.fatGramsTarget}g</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 block">Hydration</span>
                <span className="text-sm font-black text-blue-500">{liveHydration.totalRecommendedMl} ml</span>
              </div>
            </div>
          </div>

          {/* Audio & Haptic Controls */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-500" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Sound Effects & Haptics</span>
                <span className="text-[10px] text-slate-400">Tactile clicks, water droplet chimes, ring completion audio</span>
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
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-obsidian-800 hover:bg-slate-200 dark:hover:bg-obsidian-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export My Vault (JSON)</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearMyData}
                  disabled={isDeleting}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset All Data</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-obsidian-800 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-400 text-xs font-bold transition flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-obsidian-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
