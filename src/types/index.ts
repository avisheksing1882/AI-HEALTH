export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
export type FitnessGoal = 'lose_fast' | 'lose_moderate' | 'maintain' | 'gain_lean' | 'gain_mass';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type HealthCondition = 
  | 'thyroid'         // Hypo / Hyperthyroidism
  | 'pcos_pcod'       // Polycystic Ovary Syndrome / Disease
  | 'knee_pain'       // Knee Joint / Patellofemoral Pain
  | 'back_pain'       // Lower Back / Lumbar Strain
  | 'diabetes_type2'  // Type 2 Diabetes / Insulin Resistance
  | 'hypertension'    // High Blood Pressure
  | 'gerd_acidity'    // Acid Reflux / GERD
  | 'fatty_liver'     // NAFLD / Fatty Liver
  | 'uric_acid'       // Gout / High Uric Acid
  | 'none';

export interface UserProfile {
  id: string; // Unique User ID (e.g. google sub or email-based slug)
  email: string; // User email (e.g. user@gmail.com)
  name: string;
  avatarUrl?: string;
  googleId?: string;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
  fitnessGoal: FitnessGoal;
  healthConditions?: HealthCondition[];
  workoutDaysPerWeek?: number; // Target workout days per week (1-7, default 4)
  dailyStepGoal: number;
  dailyActiveCalorieGoal: number;
  dailyExerciseMinutesGoal: number;
  dailyWaterGoalMl: number;
  bmr: number;
  tdee: number;
  calorieTarget: number;
  proteinGramsTarget: number;
  carbsGramsTarget: number;
  fatGramsTarget: number;
  fiberGramsTarget: number;
  geminiApiKey?: string;
  useFallbackAi: boolean;
  theme: 'dark' | 'light' | 'system';
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  token?: string;
  loginMethod: 'google_gis' | 'google_one_click' | 'direct_gmail';
  loggedInAt: string;
}

export interface GoogleJwtPayload {
  sub: string;
  email: string;
  email_verified?: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  iat?: number;
  exp?: number;
}

export interface FoodItemNutrition {
  id: string;
  name: string;
  portionGrams: number;
  portionDescription: string; // e.g. "1 medium bowl (150g)", "2 chapatis"
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  confidence?: number; // 0 to 1
  category?: 'grain' | 'protein' | 'vegetable' | 'fruit' | 'dairy' | 'snack' | 'sweet' | 'beverage' | 'mixed';
  plateLocation?: string; // e.g. "top left", "center", "right bowl"
  boundingBox?: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
  notes?: string;
}

export interface MealLog {
  id: string;
  userId: string; // Scoped to user
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  mealType: MealType;
  title: string;
  photoUri?: string;
  items: FoodItemNutrition[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalSugar: number;
  totalSodium: number;
  aiAnalyzed: boolean;
  confidenceScore: number;
  disclaimer: string;
  userModified: boolean;
  tags?: string[];
  createdAt: string;
}

export type WorkoutType = 
  | 'walking'
  | 'running'
  | 'cycling'
  | 'gym_strength'
  | 'yoga'
  | 'hiit'
  | 'swimming'
  | 'pilates'
  | 'sports'
  | 'other';

export interface WorkoutLog {
  id: string;
  userId: string; // Scoped to user
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: WorkoutType;
  title: string;
  durationMinutes: number;
  caloriesBurned: number;
  distanceKm?: number;
  avgHeartRate?: number;
  intensity: 'light' | 'moderate' | 'vigorous' | 'extreme';
  notes?: string;
  source: 'manual' | 'live_tracker' | 'sensor';
  createdAt: string;
}

export interface DailyActivityLog {
  id: string; // Composite ID: `${userId}_${date}`
  userId: string; // Scoped to user
  date: string; // YYYY-MM-DD
  steps: number;
  stepGoal: number;
  distanceKm: number;
  activeMinutes: number;
  activeCaloriesBurned: number; // Burned via exercise & walking
  restingCaloriesBurned: number; // BMR portion for the day
  totalCaloriesBurned: number;
  hourlySteps: { [hour: number]: number }; // hour 0-23 -> step count
  waterMl: number;
  waterGoalMl: number;
  weightKg?: number;
  isGoalMet: boolean;
  streakCount: number;
  updatedAt: string;
}

export interface WeightLog {
  id: string;
  userId: string; // Scoped to user
  date: string; // YYYY-MM-DD
  time: string;
  weightKg: number;
  bmi: number;
  bodyFatPercent?: number;
  notes?: string;
}

export interface WaterLog {
  id: string;
  userId: string; // Scoped to user
  date: string; // YYYY-MM-DD
  time: string;
  amountMl: number;
}

export interface LearnedFoodCorrection {
  id: string;
  userId: string; // Scoped to user
  originalFoodName: string;
  correctedFoodName: string;
  portionRatio: number;
  customCaloriesPer100g?: number;
  customProteinPer100g?: number;
  customCarbsPer100g?: number;
  customFatPer100g?: number;
  userCorrectionCount: number;
  lastUpdated: string;
}

export interface NotificationRule {
  id: string;
  userId: string; // Scoped to user
  title: string;
  description: string;
  enabled: boolean;
  time: string; // e.g. "20:00"
  type: 'workout_reminder' | 'meal_reminder' | 'water_reminder' | 'medication_reminder' | 'custom_reminder' | 'weekly_summary' | 'streak_alert';
  mealType?: MealType;
  conditionDescription?: string;
  soundTone?: 'bell' | 'water' | 'meal' | 'medication' | 'workout';
  lastTriggered?: string;
  snoozedUntil?: string;
}

export interface InAppNotification {
  id: string;
  userId: string; // Scoped to user
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'reminder' | 'achievement';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export interface NutritionInsight {
  id: string;
  type: 'positive' | 'warning' | 'info' | 'tip';
  title: string;
  description: string;
  metric?: string;
  iconName: string;
}

export type MedicationFrequency = 'daily' | 'twice_daily' | 'three_times_daily' | 'weekly' | 'as_needed';
export type MedicationTiming = 'before_breakfast' | 'after_breakfast' | 'with_lunch' | 'after_dinner' | 'before_bed' | 'specific_time';

export interface Medication {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  frequency: MedicationFrequency;
  timing: MedicationTiming;
  reminderTime: string; // "07:00", "08:30", "20:00"
  reminderEnabled: boolean;
  conditionTag?: HealthCondition;
  notes?: string;
  color?: string;
  createdAt: string;
}

export interface MedicationLog {
  id: string;
  userId: string;
  medicationId: string;
  medicationName: string;
  date: string; // YYYY-MM-DD
  timeTaken: string; // HH:mm
  status: 'taken' | 'skipped';
  timestamp: string;
}

export interface DaySummary {
  date: string;
  activity: DailyActivityLog;
  meals: MealLog[];
  workouts: WorkoutLog[];
  totalCaloriesIn: number;
  totalCaloriesOut: number;
  netCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  sugarGrams: number;
  sodiumMg: number;
  calorieTarget: number;
  calorieDeficitSurplus: number;
  score: number; // 0 - 100 consistency / health score
}
