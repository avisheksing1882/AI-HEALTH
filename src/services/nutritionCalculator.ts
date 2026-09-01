import { ActivityLevel, FitnessGoal, Gender, UserProfile, MealLog, DailyActivityLog, NutritionInsight } from '../types';

export function calculateBMR(weightKg: number, heightCm: number, age: number, gender: Gender): number {
  // Mifflin-St Jeor Equation
  if (gender === 'male') {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
  } else if (gender === 'female') {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
  } else {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 78);
  }
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const multipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };
  return Math.round(bmr * (multipliers[activityLevel] || 1.375));
}

export function calculateCalorieTarget(tdee: number, goal: FitnessGoal, gender: Gender): number {
  let target = tdee;
  switch (goal) {
    case 'lose_fast':
      target = tdee - 750;
      break;
    case 'lose_moderate':
      target = tdee - 450;
      break;
    case 'maintain':
      target = tdee;
      break;
    case 'gain_lean':
      target = tdee + 300;
      break;
    case 'gain_mass':
      target = tdee + 600;
      break;
  }

  // Safety minimum floors
  const minFloor = gender === 'female' ? 1200 : 1500;
  return Math.max(minFloor, Math.round(target));
}

export function calculateMacroTargets(calorieTarget: number, weightKg: number, goal: FitnessGoal) {
  // Protein multiplier: higher for weight loss & muscle gain (1.8-2.2g/kg), maintain (1.6g/kg)
  let proteinPerKg = 1.8;
  if (goal === 'lose_fast' || goal === 'lose_moderate') {
    proteinPerKg = 2.0; // preserve lean mass in deficit
  } else if (goal === 'gain_lean' || goal === 'gain_mass') {
    proteinPerKg = 2.2;
  }

  const proteinGrams = Math.round(Math.min(weightKg * proteinPerKg, (calorieTarget * 0.35) / 4));
  const proteinCalories = proteinGrams * 4;

  // Fat target: ~25-30% of total calories
  const fatCalories = calorieTarget * 0.28;
  const fatGrams = Math.round(fatCalories / 9);

  // Carbs target: remaining calories
  const carbsCalories = Math.max(0, calorieTarget - proteinCalories - (fatGrams * 9));
  const carbsGrams = Math.round(carbsCalories / 4);

  // Fiber target: 14g per 1000 calories
  const fiberGrams = Math.round((calorieTarget / 1000) * 14);

  return {
    proteinGramsTarget: proteinGrams,
    fatGramsTarget: fatGrams,
    carbsGramsTarget: carbsGrams,
    fiberGramsTarget: fiberGrams,
  };
}

export function calculateStepCalories(steps: number, weightKg: number): number {
  // Scientific MET approx: ~0.04 kcal per step for 70kg individual, scaled linearly with weight
  const baseKcalPerStep = 0.04 * (weightKg / 70);
  return Math.round(steps * baseKcalPerStep);
}

export function calculateStepDistanceKm(steps: number, heightCm: number): number {
  // Stride length is roughly 41.5% of height for women, 41.4% for men (~0.415)
  const strideMeters = (heightCm * 0.415) / 100;
  const distanceKm = (steps * strideMeters) / 1000;
  return Number(distanceKm.toFixed(2));
}

export function calculateWorkoutCalories(
  type: string,
  durationMinutes: number,
  weightKg: number,
  intensity: 'light' | 'moderate' | 'vigorous' | 'extreme' = 'moderate'
): number {
  // MET values (Metabolic Equivalent of Task)
  const baseMETs: Record<string, number> = {
    walking: 3.5,
    running: 8.5,
    cycling: 7.0,
    gym_strength: 5.5,
    yoga: 3.0,
    hiit: 9.5,
    swimming: 7.5,
    pilates: 3.8,
    sports: 7.0,
    other: 5.0,
  };

  const intensityMultipliers = {
    light: 0.8,
    moderate: 1.0,
    vigorous: 1.25,
    extreme: 1.5,
  };

  const met = (baseMETs[type] || 5.0) * intensityMultipliers[intensity];
  // Calories = MET * weight(kg) * (duration in hours)
  const calories = met * weightKg * (durationMinutes / 60);
  return Math.round(calories);
}

export function generateNutritionInsights(
  meals: MealLog[],
  activity: DailyActivityLog,
  profile: UserProfile
): NutritionInsight[] {
  const insights: NutritionInsight[] = [];

  const totalCalories = meals.reduce((acc, m) => acc + m.totalCalories, 0);
  const totalProtein = meals.reduce((acc, m) => acc + m.totalProtein, 0);
  const totalCarbs = meals.reduce((acc, m) => acc + m.totalCarbs, 0);
  const totalFat = meals.reduce((acc, m) => acc + m.totalFat, 0);
  const totalFiber = meals.reduce((acc, m) => acc + m.totalFiber, 0);
  const totalSugar = meals.reduce((acc, m) => acc + m.totalSugar, 0);
  const totalSodium = meals.reduce((acc, m) => acc + m.totalSodium, 0);

  const calorieDiff = profile.calorieTarget - totalCalories;

  // Calorie Insights
  if (meals.length > 0) {
    if (calorieDiff > 250) {
      insights.push({
        id: 'cal-deficit',
        type: 'info',
        title: 'Healthy Calorie Deficit',
        description: `You have ${calorieDiff} kcal remaining in your daily budget. Great control!`,
        metric: `${calorieDiff} kcal left`,
        iconName: 'Flame',
      });
    } else if (calorieDiff < -200) {
      insights.push({
        id: 'cal-surplus',
        type: 'warning',
        title: 'Calorie Budget Exceeded',
        description: `You are ${Math.abs(calorieDiff)} kcal above your daily target. Consider a 20-min brisk walk to balance!`,
        metric: `+${Math.abs(calorieDiff)} kcal`,
        iconName: 'AlertCircle',
      });
    } else {
      insights.push({
        id: 'cal-optimal',
        type: 'positive',
        title: 'Right On Target',
        description: `Your energy intake is perfectly balanced with your daily goals.`,
        metric: 'Balanced',
        iconName: 'CheckCircle2',
      });
    }
  }

  // Protein Insights
  const proteinPercent = Math.round((totalProtein / profile.proteinGramsTarget) * 100);
  if (totalProtein > 0) {
    if (proteinPercent >= 100) {
      insights.push({
        id: 'protein-goal-met',
        type: 'positive',
        title: 'High Protein Achievement',
        description: `Hit ${totalProtein}g protein (${proteinPercent}% of daily goal). Fantastic for muscle repair and satiety!`,
        metric: `${totalProtein}g / ${profile.proteinGramsTarget}g`,
        iconName: 'Zap',
      });
    } else if (proteinPercent < 60 && meals.length >= 2) {
      insights.push({
        id: 'protein-low',
        type: 'warning',
        title: 'Low Protein Intake Today',
        description: `Only ${totalProtein}g logged so far (${profile.proteinGramsTarget - totalProtein}g to go). Try adding eggs, paneer, tofu, dal, or Greek yogurt.`,
        metric: `${proteinPercent}%`,
        iconName: 'TrendingDown',
      });
    }
  }

  // Fiber Insights
  if (totalFiber > 0 && totalFiber < 15 && meals.length >= 2) {
    insights.push({
      id: 'fiber-low',
      type: 'tip',
      title: 'Boost Dietary Fiber',
      description: `Current fiber is ${totalFiber}g. Adding legumes, oats, flaxseed, chia seeds, or raw salad aids digestion.`,
      metric: `${totalFiber}g logged`,
      iconName: 'Leaf',
    });
  } else if (totalFiber >= profile.fiberGramsTarget) {
    insights.push({
      id: 'fiber-met',
      type: 'positive',
      title: 'Optimal Gut Fiber',
      description: `Met your daily fiber goal (${totalFiber}g). Helps with blood sugar stability and digestion.`,
      metric: `${totalFiber}g met`,
      iconName: 'Sparkles',
    });
  }

  // Sodium / Sugar warnings
  if (totalSodium > 2300) {
    insights.push({
      id: 'sodium-high',
      type: 'warning',
      title: 'Elevated Sodium Level',
      description: `Sodium reached ${totalSodium}mg (>2,300mg recommended limit). Increase water intake to help flush excess sodium.`,
      metric: `${totalSodium}mg`,
      iconName: 'Droplet',
    });
  }

  if (totalSugar > 50) {
    insights.push({
      id: 'sugar-high',
      type: 'warning',
      title: 'High Added Sugars',
      description: `Sugar intake is ${totalSugar}g today. Try substituting sweet treats with fresh whole berries or nuts.`,
      metric: `${totalSugar}g`,
      iconName: 'AlertTriangle',
    });
  }

  // Activity & Step Insights
  if (activity.steps >= activity.stepGoal) {
    insights.push({
      id: 'step-goal-met',
      type: 'positive',
      title: 'Step Goal Crushed!',
      description: `Completed ${activity.steps.toLocaleString()} steps! You've burned ~${activity.activeCaloriesBurned} active kcal.`,
      metric: `${activity.steps.toLocaleString()} steps`,
      iconName: 'Award',
    });
  } else if (activity.steps < activity.stepGoal * 0.4) {
    const hoursNow = new Date().getHours();
    if (hoursNow >= 16) {
      insights.push({
        id: 'step-catchup',
        type: 'info',
        title: 'Step Catch-up Opportunity',
        description: `You're at ${activity.steps.toLocaleString()} steps. A 30-min walk will add ~3,000 steps to reach your goal!`,
        metric: `${Math.round((activity.steps / activity.stepGoal) * 100)}%`,
        iconName: 'Footprints',
      });
    }
  }

  // Default welcome / coaching insight if empty
  if (insights.length === 0) {
    insights.push({
      id: 'welcome-coach',
      type: 'info',
      title: 'AI Health Coach Ready',
      description: 'Snap a photo of your meal or log your workout to receive personalized metabolic insights.',
      metric: 'Active',
      iconName: 'Sparkles',
    });
  }

  return insights;
}

/**
 * Biometric Stride Length Calculation (Google Fit & ACSM Standard)
 * Men: heightCm * 0.415
 * Women: heightCm * 0.413
 */
export function calculateStrideLengthM(heightCm: number, gender: Gender = 'female'): number {
  const multiplier = gender === 'male' ? 0.415 : 0.413;
  return (heightCm * multiplier) / 100;
}

/**
 * Haversine Formula for High-Precision Geodesic Distance Calculation
 * Returns distance in kilometers between two GPS coordinates (WGS84 Earth Ellipsoid)
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371.0; // Earth's mean radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180.0;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export interface WeeklyWeightAnalysis {
  isWeighInDue: boolean;
  daysSinceLastEntry: number;
  lastWeightKg: number;
  previousWeightKg?: number;
  weeklyDeltaKg: number;
  weeklyRateKgPerWeek: number;
  projectedWeeksToGoal?: number;
  projectedGoalDate?: string;
  totalLossOrGainKg: number;
}

/**
 * Compiles 7-Day Weight Progress & Target Forecast
 */
export function calculateWeeklyWeightAnalysis(
  weightLogs: { date: string; weightKg: number }[],
  currentProfileWeightKg: number,
  targetWeightKg: number
): WeeklyWeightAnalysis {
  if (weightLogs.length === 0) {
    return {
      isWeighInDue: true,
      daysSinceLastEntry: 999,
      lastWeightKg: currentProfileWeightKg,
      weeklyDeltaKg: 0,
      weeklyRateKgPerWeek: 0,
      totalLossOrGainKg: 0
    };
  }

  const sorted = [...weightLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const latest = sorted[sorted.length - 1];
  const first = sorted[0];

  const now = new Date();
  const latestDate = new Date(latest.date + 'T00:00:00');
  const diffTime = Math.abs(now.getTime() - latestDate.getTime());
  const daysSinceLastEntry = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const isWeighInDue = daysSinceLastEntry >= 7;

  let previousWeightKg: number | undefined = undefined;
  let weeklyDeltaKg = 0;

  if (sorted.length >= 2) {
    const prev = sorted[sorted.length - 2];
    previousWeightKg = prev.weightKg;
    weeklyDeltaKg = Math.round((latest.weightKg - prev.weightKg) * 10) / 10;
  }

  const totalDays = Math.max(7, Math.floor((latestDate.getTime() - new Date(first.date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)));
  const totalChange = latest.weightKg - first.weightKg;
  const weeklyRateKgPerWeek = sorted.length >= 2 ? Math.round((totalChange / (totalDays / 7)) * 100) / 100 : 0;

  // Projected weeks to reach target
  let projectedWeeksToGoal: number | undefined = undefined;
  let projectedGoalDate: string | undefined = undefined;

  const distanceToGoal = latest.weightKg - targetWeightKg;
  if (Math.abs(distanceToGoal) > 0.1 && weeklyRateKgPerWeek !== 0) {
    const rateMatchesGoal = (distanceToGoal > 0 && weeklyRateKgPerWeek < 0) || (distanceToGoal < 0 && weeklyRateKgPerWeek > 0);
    if (rateMatchesGoal) {
      projectedWeeksToGoal = Math.max(1, Math.round(Math.abs(distanceToGoal / weeklyRateKgPerWeek)));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + projectedWeeksToGoal * 7);
      projectedGoalDate = futureDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  return {
    isWeighInDue,
    daysSinceLastEntry,
    lastWeightKg: latest.weightKg,
    previousWeightKg,
    weeklyDeltaKg,
    weeklyRateKgPerWeek,
    projectedWeeksToGoal,
    projectedGoalDate,
    totalLossOrGainKg: Math.round((latest.weightKg - first.weightKg) * 10) / 10
  };
}
