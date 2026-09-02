import Dexie, { Table } from 'dexie';
import {
  UserProfile,
  MealLog,
  DailyActivityLog,
  WorkoutLog,
  WeightLog,
  WaterLog,
  LearnedFoodCorrection,
  NotificationRule,
  InAppNotification,
  Medication,
  MedicationLog
} from '../types';
import {
  syncProfileToCloud,
  syncMealToCloud,
  deleteMealFromCloud,
  syncDailyActivityToCloud,
  syncWorkoutToCloud,
  deleteWorkoutFromCloud,
  syncWeightLogToCloud,
  deleteWeightLogFromCloud,
  syncWaterLogToCloud,
  deleteWaterLogFromCloud,
  syncMedicationToCloud,
  deleteMedicationFromCloud,
  syncMedicationLogToCloud,
  syncNotificationRuleToCloud
} from './firestoreSync';

// ==========================================
// 🛡️ DUAL-LAYER STORAGE: LOCALSTORAGE BACKUP & CACHE
// ==========================================
const VAULT_PREFIX = 'vitaltrack_vault_v1_';
const USERS_REGISTRY_KEY = 'vitaltrack_registered_users_registry';

/**
 * In-memory high-speed cache layer
 */
const inMemoryCache = new Map<string, any>();

function getLocalStorageKey(userId: string, storeName: string): string {
  return `${VAULT_PREFIX}${userId}_${storeName}`;
}

/**
 * Saves a store array into localStorage backup cache
 */
export function saveToLocalCache<T>(userId: string, storeName: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getLocalStorageKey(userId, storeName);
    localStorage.setItem(key, JSON.stringify(data));
    inMemoryCache.set(key, data);
  } catch (e) {
    console.warn(`LocalStorage quota exceeded or write error for ${storeName}`, e);
  }
}

/**
 * Reads a store array from localStorage backup cache
 */
export function readFromLocalCache<T>(userId: string, storeName: string): T[] {
  if (typeof window === 'undefined') return [];
  const key = getLocalStorageKey(userId, storeName);
  
  if (inMemoryCache.has(key)) {
    return inMemoryCache.get(key) as T[];
  }

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as T[];
      inMemoryCache.set(key, parsed);
      return parsed;
    }
  } catch (e) {
    console.warn(`LocalStorage read error for ${storeName}`, e);
  }
  return [];
}

/**
 * Save user profile to persistent registry
 */
export function saveProfileToRegistry(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getLocalStorageKey(profile.id, 'profile');
    localStorage.setItem(key, JSON.stringify(profile));
    inMemoryCache.set(key, profile);

    // Update global users directory
    const registryRaw = localStorage.getItem(USERS_REGISTRY_KEY);
    const registry: Record<string, { id: string; email: string; name: string; avatarUrl?: string }> = registryRaw ? JSON.parse(registryRaw) : {};
    registry[profile.email.toLowerCase()] = {
      id: profile.id,
      email: profile.email.toLowerCase(),
      name: profile.name,
      avatarUrl: profile.avatarUrl
    };
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(registry));
  } catch (e) {
    console.warn('Failed to save profile to persistent registry', e);
  }
}

export function readProfileFromRegistry(userId: string): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const key = getLocalStorageKey(userId, 'profile');
  if (inMemoryCache.has(key)) {
    return inMemoryCache.get(key) as UserProfile;
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as UserProfile;
      inMemoryCache.set(key, parsed);
      return parsed;
    }
  } catch {
    // Ignored
  }
  return null;
}

// Clean up old legacy database if present to prevent primary key upgrade errors
if (typeof window !== 'undefined') {
  try {
    Dexie.delete('AuraHealthTrackerDB').catch(() => {});
  } catch {
    // Ignore
  }
}

// ==========================================
// 📦 PRIMARY LAYER: DEXIE INDEXEDDB
// ==========================================
export class HealthTrackerDatabase extends Dexie {
  userProfile!: Table<UserProfile, string>;
  meals!: Table<MealLog, string>;
  dailyActivity!: Table<DailyActivityLog, string>;
  workouts!: Table<WorkoutLog, string>;
  weightLogs!: Table<WeightLog, string>;
  waterLogs!: Table<WaterLog, string>;
  learnedCorrections!: Table<LearnedFoodCorrection, string>;
  notificationRules!: Table<NotificationRule, string>;
  inAppNotifications!: Table<InAppNotification, string>;
  medications!: Table<Medication, string>;
  medicationLogs!: Table<MedicationLog, string>;

  constructor() {
    super('VitalTrackAI_Database');
    
    this.version(1).stores({
      userProfile: 'id, email',
      meals: 'id, userId, date, mealType, createdAt, [userId+date]',
      dailyActivity: 'id, userId, date, isGoalMet, [userId+date]',
      workouts: 'id, userId, date, type, createdAt, [userId+date]',
      weightLogs: 'id, userId, date, [userId+date]',
      waterLogs: 'id, userId, date, [userId+date]',
      learnedCorrections: 'id, userId, originalFoodName, correctedFoodName',
      notificationRules: 'id, userId, type, enabled, [userId+type]',
      inAppNotifications: 'id, userId, timestamp, read, [userId+read]'
    });

    this.version(2).stores({
      medications: 'id, userId, frequency, reminderEnabled, [userId+frequency]',
      medicationLogs: 'id, userId, medicationId, date, status, [userId+date]'
    });
  }
}

export const db = new HealthTrackerDatabase();

/**
 * Bi-directional Sync: Ensures IndexedDB and Local Cache are 100% in sync
 */
export async function syncUserDataWithCache(userId: string): Promise<void> {
  try {
    // 1. User Profile
    let profile = await db.userProfile.get(userId);
    if (!profile) {
      const cached = readProfileFromRegistry(userId);
      if (cached) {
        await db.userProfile.put(cached);
        profile = cached;
      }
    } else {
      saveProfileToRegistry(profile);
    }

    // 2. Meals
    const dbMeals = await db.meals.where('userId').equals(userId).toArray();
    const cachedMeals = readFromLocalCache<MealLog>(userId, 'meals');
    if (dbMeals.length === 0 && cachedMeals.length > 0) {
      await db.meals.bulkPut(cachedMeals);
    } else if (dbMeals.length > 0) {
      saveToLocalCache(userId, 'meals', dbMeals);
    }

    // 3. Daily Activity
    const dbActivities = await db.dailyActivity.where('userId').equals(userId).toArray();
    const cachedActivities = readFromLocalCache<DailyActivityLog>(userId, 'dailyActivity');
    if (dbActivities.length === 0 && cachedActivities.length > 0) {
      await db.dailyActivity.bulkPut(cachedActivities);
    } else if (dbActivities.length > 0) {
      saveToLocalCache(userId, 'dailyActivity', dbActivities);
    }

    // 4. Workouts
    const dbWorkouts = await db.workouts.where('userId').equals(userId).toArray();
    const cachedWorkouts = readFromLocalCache<WorkoutLog>(userId, 'workouts');
    if (dbWorkouts.length === 0 && cachedWorkouts.length > 0) {
      await db.workouts.bulkPut(cachedWorkouts);
    } else if (dbWorkouts.length > 0) {
      saveToLocalCache(userId, 'workouts', dbWorkouts);
    }

    // 5. Weight Logs
    const dbWeights = await db.weightLogs.where('userId').equals(userId).toArray();
    const cachedWeights = readFromLocalCache<WeightLog>(userId, 'weightLogs');
    if (dbWeights.length === 0 && cachedWeights.length > 0) {
      await db.weightLogs.bulkPut(cachedWeights);
    } else if (dbWeights.length > 0) {
      saveToLocalCache(userId, 'weightLogs', dbWeights);
    }

    // 6. Water Logs
    const dbWater = await db.waterLogs.where('userId').equals(userId).toArray();
    const cachedWater = readFromLocalCache<WaterLog>(userId, 'waterLogs');
    if (dbWater.length === 0 && cachedWater.length > 0) {
      await db.waterLogs.bulkPut(cachedWater);
    } else if (dbWater.length > 0) {
      saveToLocalCache(userId, 'waterLogs', dbWater);
    }

    // 7. Notification Rules
    const dbRules = await db.notificationRules.where('userId').equals(userId).toArray();
    const cachedRules = readFromLocalCache<NotificationRule>(userId, 'notificationRules');
    if (dbRules.length === 0 && cachedRules.length > 0) {
      await db.notificationRules.bulkPut(cachedRules);
    } else if (dbRules.length > 0) {
      saveToLocalCache(userId, 'notificationRules', dbRules);
    }
  } catch (err) {
    console.warn('Cache synchronization warning:', err);
  }
}

/**
 * Creates a clean default baseline User Profile for a new registered Google user
 */
export function createDefaultUserProfile(userId: string, email: string, name: string, avatarUrl?: string): UserProfile {
  const cleanName = name || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const profile: UserProfile = {
    id: userId,
    email: email.toLowerCase().trim(),
    name: cleanName,
    avatarUrl,
    age: 28,
    gender: 'male',
    heightCm: 175,
    weightKg: 70,
    targetWeightKg: 68,
    activityLevel: 'moderate',
    fitnessGoal: 'maintain',
    healthConditions: [],
    dailyStepGoal: 10000,
    dailyActiveCalorieGoal: 500,
    dailyExerciseMinutesGoal: 45,
    dailyWaterGoalMl: 3000,
    bmr: 1680,
    tdee: 2350,
    calorieTarget: 2350,
    proteinGramsTarget: 140,
    carbsGramsTarget: 260,
    fatGramsTarget: 65,
    fiberGramsTarget: 30,
    useFallbackAi: true,
    theme: 'dark',
    soundEnabled: true,
    hapticsEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  saveProfileToRegistry(profile);
  // Cloud sync
  syncProfileToCloud(profile);
  return profile;
}

/**
 * Default Notification Rules template for a specific user
 */
export function getDefaultNotificationRules(userId: string): NotificationRule[] {
  return [
    {
      id: `notif-evening-walk-${userId}`,
      userId,
      title: 'Evening Activity Check-in',
      description: 'Nudge to complete your remaining step goal if below 70% by 8:00 PM',
      enabled: true,
      time: '20:00',
      type: 'workout_reminder',
      conditionDescription: 'Daily steps < 70% of goal'
    },
    {
      id: `notif-breakfast-${userId}`,
      userId,
      title: 'Breakfast Log Reminder',
      description: 'Gentle reminder to log your morning meal and fuel your day',
      enabled: true,
      time: '09:00',
      type: 'meal_reminder',
      mealType: 'breakfast'
    },
    {
      id: `notif-lunch-${userId}`,
      userId,
      title: 'Lunchtime Nutrition Lens',
      description: 'Snap a photo of your lunch plate for instant macro breakdown',
      enabled: true,
      time: '13:30',
      type: 'meal_reminder',
      mealType: 'lunch'
    },
    {
      id: `notif-dinner-${userId}`,
      userId,
      title: 'Dinner Log Reminder',
      description: 'Track evening calories and close out your daily nutrition ring',
      enabled: true,
      time: '20:30',
      type: 'meal_reminder',
      mealType: 'dinner'
    },
    {
      id: `notif-hydration-${userId}`,
      userId,
      title: 'Hydration Pulse',
      description: 'Drink a fresh glass of water every 2 hours during the day',
      enabled: true,
      time: '11:00',
      type: 'water_reminder'
    },
    {
      id: `notif-weekly-summary-${userId}`,
      userId,
      title: 'Sunday Health Recap',
      description: 'Weekly breakdown of streak achievements, total steps, and calorie balance',
      enabled: true,
      time: '19:00',
      type: 'weekly_summary'
    }
  ];
}

/**
 * Get user profile by userId or email (checking DB, Cache, and Registry)
 */
export async function getUserProfile(userId: string): Promise<UserProfile | undefined> {
  try {
    const fromDb = await db.userProfile.get(userId);
    if (fromDb) {
      saveProfileToRegistry(fromDb);
      return fromDb;
    }
  } catch (e) {
    console.warn('Error fetching user profile from IndexedDB:', e);
  }

  // Fallback to localStorage registry
  const cached = readProfileFromRegistry(userId);
  if (cached) {
    try {
      await db.userProfile.put(cached);
    } catch {
      // Ignored
    }
    return cached;
  }

  return undefined;
}

export async function getUserProfileByEmail(email: string): Promise<UserProfile | undefined> {
  const clean = email.trim().toLowerCase();
  try {
    const fromDb = await db.userProfile.where('email').equalsIgnoreCase(clean).first();
    if (fromDb) return fromDb;
  } catch {
    // Fallback
  }

  if (typeof window !== 'undefined') {
    try {
      const regRaw = localStorage.getItem(USERS_REGISTRY_KEY);
      if (regRaw) {
        const reg = JSON.parse(regRaw);
        if (reg[clean]?.id) {
          return await getUserProfile(reg[clean].id);
        }
      }
    } catch {
      // Ignored
    }
  }
  return undefined;
}

/**
 * Save / update user profile with synchronous dual-layer cache write
 */
export async function saveUserProfile(userId: string, changes: Partial<UserProfile>): Promise<UserProfile> {
  const current = await getUserProfile(userId);
  if (!current) {
    throw new Error(`User profile not found for userId: ${userId}`);
  }
  const updated: UserProfile = {
    ...current,
    ...changes,
    updatedAt: new Date().toISOString()
  };
  
  // Dual-write to DB and Cache
  await db.userProfile.put(updated);
  saveProfileToRegistry(updated);
  // Cloud sync
  syncProfileToCloud(updated);
  return updated;
}

export async function getTodayDateString(): Promise<string> {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get or create daily activity for a specific user and date with dual-layer caching
 */
export async function getOrCreateDailyActivity(userId: string, date: string, profile?: UserProfile): Promise<DailyActivityLog> {
  const activityId = `${userId}_${date}`;
  let log: DailyActivityLog | undefined;
  
  try {
    log = await db.dailyActivity.get(activityId);
  } catch {
    // Try cache
  }

  if (!log) {
    const cachedList = readFromLocalCache<DailyActivityLog>(userId, 'dailyActivity');
    log = cachedList.find(a => a.id === activityId || a.date === date);
  }
  
  if (!log) {
    const user = profile || await getUserProfile(userId);
    const bmr = user ? user.bmr : 1400;
    const stepGoal = user ? user.dailyStepGoal : 10000;
    const waterGoal = user ? user.dailyWaterGoalMl : 3000;
    const weightKg = user ? user.weightKg : 62;

    log = {
      id: activityId,
      userId,
      date,
      steps: 0,
      stepGoal,
      distanceKm: 0,
      activeMinutes: 0,
      activeCaloriesBurned: 0,
      restingCaloriesBurned: Math.round(bmr),
      totalCaloriesBurned: Math.round(bmr),
      hourlySteps: {},
      waterMl: 0,
      waterGoalMl: waterGoal,
      weightKg,
      isGoalMet: false,
      streakCount: 0,
      updatedAt: new Date().toISOString()
    };
    await db.dailyActivity.put(log);
  }

  // Update cache
  const cachedList = readFromLocalCache<DailyActivityLog>(userId, 'dailyActivity');
  const filtered = cachedList.filter(a => a.id !== activityId);
  filtered.push(log);
  saveToLocalCache(userId, 'dailyActivity', filtered);

  return log;
}

/**
 * Update daily activity for a specific user with automatic cache syncing
 */
export async function updateDailyActivity(userId: string, date: string, changes: Partial<DailyActivityLog>): Promise<DailyActivityLog> {
  const current = await getOrCreateDailyActivity(userId, date);
  const resting = changes.restingCaloriesBurned ?? current.restingCaloriesBurned;
  const active = changes.activeCaloriesBurned ?? current.activeCaloriesBurned;
  const steps = changes.steps ?? current.steps;
  const stepGoal = changes.stepGoal ?? current.stepGoal;

  const updated: DailyActivityLog = {
    ...current,
    ...changes,
    id: `${userId}_${date}`,
    userId,
    date,
    totalCaloriesBurned: active + resting,
    isGoalMet: steps >= stepGoal,
    updatedAt: new Date().toISOString()
  };

  await db.dailyActivity.put(updated);

  // Update local cache
  const cachedList = readFromLocalCache<DailyActivityLog>(userId, 'dailyActivity');
  const filtered = cachedList.filter(a => a.id !== updated.id);
  filtered.push(updated);
  saveToLocalCache(userId, 'dailyActivity', filtered);
  // Cloud sync
  syncDailyActivityToCloud(updated);

  return updated;
}

/**
 * Save meal with dual-layer caching
 */
export async function saveMealLogWithCache(meal: MealLog): Promise<void> {
  await db.meals.put(meal);
  const cached = readFromLocalCache<MealLog>(meal.userId, 'meals');
  const filtered = cached.filter(m => m.id !== meal.id);
  filtered.push(meal);
  saveToLocalCache(meal.userId, 'meals', filtered);
  // Cloud sync
  syncMealToCloud(meal);
}

/**
 * Delete meal with cache update
 */
export async function deleteMealLogWithCache(userId: string, mealId: string): Promise<void> {
  await db.meals.delete(mealId);
  const cached = readFromLocalCache<MealLog>(userId, 'meals');
  const filtered = cached.filter(m => m.id !== mealId);
  saveToLocalCache(userId, 'meals', filtered);
  // Cloud sync
  deleteMealFromCloud(userId, mealId);
}

/**
 * Save workout with dual-layer caching
 */
export async function saveWorkoutLogWithCache(workout: WorkoutLog): Promise<void> {
  await db.workouts.put(workout);
  const cached = readFromLocalCache<WorkoutLog>(workout.userId, 'workouts');
  const filtered = cached.filter(w => w.id !== workout.id);
  filtered.push(workout);
  saveToLocalCache(workout.userId, 'workouts', filtered);
  // Cloud sync
  syncWorkoutToCloud(workout);
}

/**
 * Delete workout with dual-layer caching and cloud sync
 */
export async function deleteWorkoutLogWithCache(userId: string, workoutId: string): Promise<void> {
  await db.workouts.delete(workoutId);
  const cached = readFromLocalCache<WorkoutLog>(userId, 'workouts');
  const filtered = cached.filter(w => w.id !== workoutId);
  saveToLocalCache(userId, 'workouts', filtered);
  deleteWorkoutFromCloud(userId, workoutId);
}

/**
 * Save weight log with dual-layer caching
 */
export async function saveWeightLogWithCache(weight: WeightLog): Promise<void> {
  await db.weightLogs.put(weight);
  const cached = readFromLocalCache<WeightLog>(weight.userId, 'weightLogs');
  const filtered = cached.filter(w => w.id !== weight.id);
  filtered.push(weight);
  saveToLocalCache(weight.userId, 'weightLogs', filtered);
  // Cloud sync
  syncWeightLogToCloud(weight);
}

/**
 * Delete weight log with dual-layer caching and cloud sync
 */
export async function deleteWeightLogWithCache(userId: string, weightId: string): Promise<void> {
  await db.weightLogs.delete(weightId);
  const cached = readFromLocalCache<WeightLog>(userId, 'weightLogs');
  const filtered = cached.filter(w => w.id !== weightId);
  saveToLocalCache(userId, 'weightLogs', filtered);
  deleteWeightLogFromCloud(userId, weightId);
}

/**
 * Save water log with dual-layer caching
 */
export async function saveWaterLogWithCache(water: WaterLog): Promise<void> {
  await db.waterLogs.put(water);
  const cached = readFromLocalCache<WaterLog>(water.userId, 'waterLogs');
  const filtered = cached.filter(w => w.id !== water.id);
  filtered.push(water);
  saveToLocalCache(water.userId, 'waterLogs', filtered);
  // Cloud sync
  syncWaterLogToCloud(water);
}

/**
 * Delete water log with dual-layer caching and cloud sync
 */
export async function deleteWaterLogWithCache(userId: string, waterId: string): Promise<void> {
  await db.waterLogs.delete(waterId);
  const cached = readFromLocalCache<WaterLog>(userId, 'waterLogs');
  const filtered = cached.filter(w => w.id !== waterId);
  saveToLocalCache(userId, 'waterLogs', filtered);
  deleteWaterLogFromCloud(userId, waterId);
}

/**
 * Purges all demo / legacy data across all tables
 */
export async function purgeAllDemoData(): Promise<void> {
  await db.meals.clear();
  await db.dailyActivity.clear();
  await db.workouts.clear();
  await db.weightLogs.clear();
  await db.waterLogs.clear();
  await db.inAppNotifications.clear();
  await db.medications.clear();
  await db.medicationLogs.clear();
}

/**
 * Get all medications for a user
 */
export async function getMedications(userId: string): Promise<Medication[]> {
  try {
    const meds = await db.medications.where('userId').equals(userId).toArray();
    if (meds.length > 0) return meds;
    return readFromLocalCache<Medication>(userId, 'medications');
  } catch (e) {
    console.warn('Error reading medications:', e);
    return readFromLocalCache<Medication>(userId, 'medications');
  }
}

/**
 * Save / update a medication
 */
export async function saveMedication(med: Medication): Promise<void> {
  try {
    await db.medications.put(med);
  } catch (e) {
    console.warn('Error saving medication to IndexedDB:', e);
  }
  const cached = readFromLocalCache<Medication>(med.userId, 'medications');
  const filtered = cached.filter(m => m.id !== med.id);
  filtered.push(med);
  saveToLocalCache(med.userId, 'medications', filtered);
  // Cloud sync
  syncMedicationToCloud(med);
}

/**
 * Delete a medication
 */
export async function deleteMedication(userId: string, medId: string): Promise<void> {
  try {
    await db.medications.delete(medId);
    await db.medicationLogs.where('medicationId').equals(medId).delete();
  } catch (e) {
    console.warn('Error deleting medication from IndexedDB:', e);
  }
  const cached = readFromLocalCache<Medication>(userId, 'medications');
  const filtered = cached.filter(m => m.id !== medId);
  saveToLocalCache(userId, 'medications', filtered);
  // Cloud sync
  deleteMedicationFromCloud(userId, medId);
}

/**
 * Log medication taken status for a date
 */
export async function logMedicationStatus(log: MedicationLog): Promise<void> {
  try {
    await db.medicationLogs.put(log);
  } catch (e) {
    console.warn('Error logging medication status to IndexedDB:', e);
  }
  const cached = readFromLocalCache<MedicationLog>(log.userId, 'medicationLogs');
  const filtered = cached.filter(l => !(l.medicationId === log.medicationId && l.date === log.date));
  filtered.push(log);
  saveToLocalCache(log.userId, 'medicationLogs', filtered);
  // Cloud sync
  syncMedicationLogToCloud(log);
}

/**
 * Get medication logs for a specific date
 */
export async function getMedicationLogsForDate(userId: string, date: string): Promise<MedicationLog[]> {
  try {
    const logs = await db.medicationLogs.where('userId').equals(userId).and(l => l.date === date).toArray();
    if (logs.length > 0) return logs;
    const cached = readFromLocalCache<MedicationLog>(userId, 'medicationLogs');
    return cached.filter(l => l.date === date);
  } catch (e) {
    console.warn('Error getting medication logs:', e);
    const cached = readFromLocalCache<MedicationLog>(userId, 'medicationLogs');
    return cached.filter(l => l.date === date);
  }
}
