/**
 * 🔥 Firestore Cloud Sync Layer
 * 
 * Provides bi-directional sync between local IndexedDB (Dexie) and Cloud Firestore.
 * - On data write: pushes to Firestore in the background (fire-and-forget)
 * - On login: pulls from Firestore and merges with local data
 * - Offline-first: local writes are instant, cloud sync is async
 * 
 * Collections structure:
 *   users/{userId}/profile      → single document
 *   users/{userId}/meals/{id}
 *   users/{userId}/dailyActivity/{id}
 *   users/{userId}/workouts/{id}
 *   users/{userId}/weightLogs/{id}
 *   users/{userId}/waterLogs/{id}
 *   users/{userId}/medications/{id}
 *   users/{userId}/medicationLogs/{id}
 *   users/{userId}/notificationRules/{id}
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  query,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { firestore } from './firebase';
import {
  UserProfile,
  MealLog,
  DailyActivityLog,
  WorkoutLog,
  WeightLog,
  WaterLog,
  Medication,
  MedicationLog,
  NotificationRule
} from '../types';

// ==========================================
// 🔧 HELPERS
// ==========================================

let syncEnabled = true;

/** Disable cloud sync (e.g., when offline or during bulk local operations) */
export function disableCloudSync(): void {
  syncEnabled = false;
}

/** Enable cloud sync */
export function enableCloudSync(): void {
  syncEnabled = true;
}

/** Check if cloud sync is enabled */
export function isCloudSyncEnabled(): boolean {
  return syncEnabled;
}

/**
 * Recursively sanitizes an object for Firestore.
 * Strips all `undefined` values because Firestore throws a runtime error if undefined is present.
 */
export function sanitizeForFirestore<T>(obj: T): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)).filter(item => item !== undefined);
  }
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj as Record<string, any>)) {
    if (val !== undefined) {
      result[key] = sanitizeForFirestore(val);
    }
  }
  return result;
}

/**
 * Safely push a document to Firestore (fire-and-forget with error logging)
 */
async function safeSetDoc(docPath: string[], data: Record<string, any>): Promise<void> {
  if (!syncEnabled) return;
  try {
    const ref = doc(firestore, docPath.join('/'));
    const cleanData = sanitizeForFirestore(data);
    await setDoc(ref, { ...cleanData, _syncedAt: new Date().toISOString() }, { merge: true });
    console.log(`[Firestore Sync] ✅ Synced to cloud: ${docPath.join('/')}`);
  } catch (err) {
    console.error(`[Firestore Sync] ❌ Write failed for ${docPath.join('/')}:`, err);
  }
}

/**
 * Safely delete a document from Firestore
 */
async function safeDeleteDoc(docPath: string[]): Promise<void> {
  if (!syncEnabled) return;
  try {
    const ref = doc(firestore, docPath.join('/'));
    await deleteDoc(ref);
  } catch (err) {
    console.warn(`[Firestore Sync] Delete failed for ${docPath.join('/')}:`, err);
  }
}

/**
 * Read all documents from a subcollection
 */
async function readCollection<T>(userId: string, collectionName: string): Promise<T[]> {
  try {
    const colRef = collection(firestore, 'users', userId, collectionName);
    const snapshot = await getDocs(query(colRef));
    return snapshot.docs.map(d => {
      const data = d.data();
      // Remove internal sync metadata
      delete data._syncedAt;
      return data as T;
    });
  } catch (err) {
    console.warn(`[Firestore Sync] Read failed for users/${userId}/${collectionName}:`, err);
    return [];
  }
}

// ==========================================
// 📤 PUSH TO CLOUD (Write Operations)
// ==========================================

/** Sync user profile to Firestore */
export function syncProfileToCloud(profile: UserProfile): void {
  safeSetDoc(['users', profile.id, 'profile', 'data'], { ...profile });
}

/** Sync a meal log to Firestore */
export function syncMealToCloud(meal: MealLog): void {
  safeSetDoc(['users', meal.userId, 'meals', meal.id], { ...meal });
}

/** Delete a meal from Firestore */
export function deleteMealFromCloud(userId: string, mealId: string): void {
  safeDeleteDoc(['users', userId, 'meals', mealId]);
}

/** Sync daily activity to Firestore */
export function syncDailyActivityToCloud(activity: DailyActivityLog): void {
  safeSetDoc(['users', activity.userId, 'dailyActivity', activity.id], { ...activity });
}

/** Sync a workout to Firestore */
export function syncWorkoutToCloud(workout: WorkoutLog): void {
  safeSetDoc(['users', workout.userId, 'workouts', workout.id], { ...workout });
}

/** Delete a workout from Firestore */
export function deleteWorkoutFromCloud(userId: string, workoutId: string): void {
  safeDeleteDoc(['users', userId, 'workouts', workoutId]);
}

/** Sync a weight log to Firestore */
export function syncWeightLogToCloud(weight: WeightLog): void {
  safeSetDoc(['users', weight.userId, 'weightLogs', weight.id], { ...weight });
}

/** Delete a weight log from Firestore */
export function deleteWeightLogFromCloud(userId: string, weightId: string): void {
  safeDeleteDoc(['users', userId, 'weightLogs', weightId]);
}

/** Sync a water log to Firestore */
export function syncWaterLogToCloud(water: WaterLog): void {
  safeSetDoc(['users', water.userId, 'waterLogs', water.id], { ...water });
}

/** Delete a water log from Firestore */
export function deleteWaterLogFromCloud(userId: string, waterId: string): void {
  safeDeleteDoc(['users', userId, 'waterLogs', waterId]);
}

/** Sync a medication to Firestore */
export function syncMedicationToCloud(med: Medication): void {
  safeSetDoc(['users', med.userId, 'medications', med.id], { ...med });
}

/** Delete a medication from Firestore */
export function deleteMedicationFromCloud(userId: string, medId: string): void {
  safeDeleteDoc(['users', userId, 'medications', medId]);
}

/** Sync a medication log to Firestore */
export function syncMedicationLogToCloud(log: MedicationLog): void {
  safeSetDoc(['users', log.userId, 'medicationLogs', log.id], { ...log });
}

/** Sync a notification rule to Firestore */
export function syncNotificationRuleToCloud(rule: NotificationRule): void {
  safeSetDoc(['users', rule.userId, 'notificationRules', rule.id], { ...rule });
}

// ==========================================
// 📥 PULL FROM CLOUD (Read / Merge Operations)
// ==========================================

/** Pull user profile from Firestore */
export async function pullProfileFromCloud(userId: string): Promise<UserProfile | null> {
  try {
    const ref = doc(firestore, 'users', userId, 'profile', 'data');
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) {
      const data = snapshot.data();
      delete data._syncedAt;
      return data as UserProfile;
    }
  } catch (err) {
    console.warn(`[Firestore Sync] Pull profile failed for ${userId}:`, err);
  }
  return null;
}

/** Pull all meals from Firestore */
export async function pullMealsFromCloud(userId: string): Promise<MealLog[]> {
  return readCollection<MealLog>(userId, 'meals');
}

/** Pull all daily activities from Firestore */
export async function pullDailyActivitiesFromCloud(userId: string): Promise<DailyActivityLog[]> {
  return readCollection<DailyActivityLog>(userId, 'dailyActivity');
}

/** Pull all workouts from Firestore */
export async function pullWorkoutsFromCloud(userId: string): Promise<WorkoutLog[]> {
  return readCollection<WorkoutLog>(userId, 'workouts');
}

/** Pull all weight logs from Firestore */
export async function pullWeightLogsFromCloud(userId: string): Promise<WeightLog[]> {
  return readCollection<WeightLog>(userId, 'weightLogs');
}

/** Pull all water logs from Firestore */
export async function pullWaterLogsFromCloud(userId: string): Promise<WaterLog[]> {
  return readCollection<WaterLog>(userId, 'waterLogs');
}

/** Pull all medications from Firestore */
export async function pullMedicationsFromCloud(userId: string): Promise<Medication[]> {
  return readCollection<Medication>(userId, 'medications');
}

/** Pull all medication logs from Firestore */
export async function pullMedicationLogsFromCloud(userId: string): Promise<MedicationLog[]> {
  return readCollection<MedicationLog>(userId, 'medicationLogs');
}

/** Pull all notification rules from Firestore */
export async function pullNotificationRulesFromCloud(userId: string): Promise<NotificationRule[]> {
  return readCollection<NotificationRule>(userId, 'notificationRules');
}

// ==========================================
// 🔄 FULL SYNC ON LOGIN
// ==========================================

/**
 * Performs a full bi-directional sync on user login:
 * 1. Pulls all data from Firestore
 * 2. Merges with local IndexedDB (cloud data wins for conflicts based on updatedAt/createdAt)
 * 3. Pushes any local-only data back to Firestore
 * 
 * This is called from authService.processGoogleLogin() after the user is authenticated.
 */
export async function fullSyncOnLogin(
  userId: string,
  localData: {
    profile: UserProfile | undefined;
    meals: MealLog[];
    dailyActivities: DailyActivityLog[];
    workouts: WorkoutLog[];
    weightLogs: WeightLog[];
    waterLogs: WaterLog[];
    medications: Medication[];
    medicationLogs: MedicationLog[];
    notificationRules: NotificationRule[];
  },
  putters: {
    putProfile: (p: UserProfile) => Promise<void>;
    putMeals: (m: MealLog[]) => Promise<void>;
    putDailyActivities: (a: DailyActivityLog[]) => Promise<void>;
    putWorkouts: (w: WorkoutLog[]) => Promise<void>;
    putWeightLogs: (w: WeightLog[]) => Promise<void>;
    putWaterLogs: (w: WaterLog[]) => Promise<void>;
    putMedications: (m: Medication[]) => Promise<void>;
    putMedicationLogs: (l: MedicationLog[]) => Promise<void>;
    putNotificationRules: (r: NotificationRule[]) => Promise<void>;
  }
): Promise<void> {
  console.log('[Firestore Sync] Starting full sync for user:', userId);

  try {
    // Pull all cloud data in parallel
    const [
      cloudProfile,
      cloudMeals,
      cloudActivities,
      cloudWorkouts,
      cloudWeightLogs,
      cloudWaterLogs,
      cloudMedications,
      cloudMedicationLogs,
      cloudNotificationRules
    ] = await Promise.all([
      pullProfileFromCloud(userId),
      pullMealsFromCloud(userId),
      pullDailyActivitiesFromCloud(userId),
      pullWorkoutsFromCloud(userId),
      pullWeightLogsFromCloud(userId),
      pullWaterLogsFromCloud(userId),
      pullMedicationsFromCloud(userId),
      pullMedicationLogsFromCloud(userId),
      pullNotificationRulesFromCloud(userId)
    ]);

    // Merge profile (cloud wins if newer)
    if (cloudProfile && localData.profile) {
      const cloudTime = new Date(cloudProfile.updatedAt || '').getTime();
      const localTime = new Date(localData.profile.updatedAt || '').getTime();
      if (cloudTime > localTime) {
        await putters.putProfile(cloudProfile);
      } else {
        syncProfileToCloud(localData.profile);
      }
    } else if (cloudProfile && !localData.profile) {
      await putters.putProfile(cloudProfile);
    } else if (!cloudProfile && localData.profile) {
      syncProfileToCloud(localData.profile);
    }

    // Merge collections: merge by ID, cloud wins on conflict
    await mergeCollection(
      localData.meals, cloudMeals, 'id',
      putters.putMeals,
      (items) => items.forEach(m => syncMealToCloud(m))
    );

    await mergeCollection(
      localData.dailyActivities, cloudActivities, 'id',
      putters.putDailyActivities,
      (items) => items.forEach(a => syncDailyActivityToCloud(a))
    );

    await mergeCollection(
      localData.workouts, cloudWorkouts, 'id',
      putters.putWorkouts,
      (items) => items.forEach(w => syncWorkoutToCloud(w))
    );

    await mergeCollection(
      localData.weightLogs, cloudWeightLogs, 'id',
      putters.putWeightLogs,
      (items) => items.forEach(w => syncWeightLogToCloud(w))
    );

    await mergeCollection(
      localData.waterLogs, cloudWaterLogs, 'id',
      putters.putWaterLogs,
      (items) => items.forEach(w => syncWaterLogToCloud(w))
    );

    await mergeCollection(
      localData.medications, cloudMedications, 'id',
      putters.putMedications,
      (items) => items.forEach(m => syncMedicationToCloud(m))
    );

    await mergeCollection(
      localData.medicationLogs, cloudMedicationLogs, 'id',
      putters.putMedicationLogs,
      (items) => items.forEach(l => syncMedicationLogToCloud(l))
    );

    await mergeCollection(
      localData.notificationRules, cloudNotificationRules, 'id',
      putters.putNotificationRules,
      (items) => items.forEach(r => syncNotificationRuleToCloud(r))
    );

    console.log('[Firestore Sync] Full sync completed successfully ✅');
  } catch (err) {
    console.warn('[Firestore Sync] Full sync encountered errors (data is safe locally):', err);
  }
}

/**
 * Generic collection merger:
 * - Items in cloud but not local → add to local
 * - Items in local but not cloud → push to cloud
 * - Items in both → keep both (cloud version preferred for conflicts)
 */
async function mergeCollection<T extends Record<string, any>>(
  localItems: T[],
  cloudItems: T[],
  idKey: string,
  putToLocal: (items: T[]) => Promise<void>,
  pushToCloud: (items: T[]) => void
): Promise<void> {
  const localMap = new Map<string, T>();
  localItems.forEach(item => localMap.set(item[idKey], item));

  const cloudMap = new Map<string, T>();
  cloudItems.forEach(item => cloudMap.set(item[idKey], item));

  // Items only in cloud → add to local
  const cloudOnly: T[] = [];
  cloudItems.forEach(item => {
    if (!localMap.has(item[idKey])) {
      cloudOnly.push(item);
    }
  });

  // Items only in local → push to cloud
  const localOnly: T[] = [];
  localItems.forEach(item => {
    if (!cloudMap.has(item[idKey])) {
      localOnly.push(item);
    }
  });

  // Merge: cloud items override local for shared IDs
  const merged = [...localItems];
  cloudOnly.forEach(item => merged.push(item));
  // Override local with cloud versions for conflicting IDs
  const finalMerged = merged.map(item => {
    const cloudVersion = cloudMap.get(item[idKey]);
    return cloudVersion || item;
  });

  // Write merged data to local
  if (cloudOnly.length > 0 || cloudItems.length > 0) {
    await putToLocal(finalMerged);
  }

  // Push local-only items to cloud
  if (localOnly.length > 0) {
    pushToCloud(localOnly);
  }
}

// ==========================================
// ⚡ LIVE REAL-TIME FIRESTORE LISTENERS
// ==========================================

export interface RealtimeSyncHandlers {
  onProfileChange?: (profile: UserProfile) => void;
  onMealsChange?: (meals: MealLog[]) => void;
  onActivityChange?: (activities: DailyActivityLog[]) => void;
  onWorkoutsChange?: (workouts: WorkoutLog[]) => void;
  onWeightChange?: (weights: WeightLog[]) => void;
  onWaterChange?: (water: WaterLog[]) => void;
  onMedicationsChange?: (meds: Medication[]) => void;
}

/**
 * ⚡ Live Real-Time Firestore Synchronization
 * Establishes real-time WebSocket listeners using Firestore onSnapshot.
 * Any updates on any device or in the database trigger immediately (sub-second)
 * without polling or waiting intervals.
 */
export function subscribeToUserRealtimeSync(
  userId: string,
  handlers?: RealtimeSyncHandlers
): () => void {
  if (!syncEnabled || !userId) return () => {};

  console.log(`[Firestore Realtime] 🟢 Live real-time stream connected for user: ${userId}`);
  const unsubscribers: (() => void)[] = [];

  try {
    // 1. Live User Profile stream
    const profileRef = doc(firestore, 'users', userId, 'profile', 'data');
    const unsubProfile = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        delete data._syncedAt;
        handlers?.onProfileChange?.(data as UserProfile);
      }
    }, (err) => console.warn('[Firestore Realtime] Profile stream error:', err));
    unsubscribers.push(unsubProfile);

    // 2. Live Meals stream
    const mealsCol = collection(firestore, 'users', userId, 'meals');
    const unsubMeals = onSnapshot(mealsCol, (snap) => {
      const meals = snap.docs.map(d => {
        const data = d.data();
        delete data._syncedAt;
        return data as MealLog;
      });
      handlers?.onMealsChange?.(meals);
    }, (err) => console.warn('[Firestore Realtime] Meals stream error:', err));
    unsubscribers.push(unsubMeals);

    // 3. Live Daily Activity stream
    const actCol = collection(firestore, 'users', userId, 'dailyActivity');
    const unsubAct = onSnapshot(actCol, (snap) => {
      const activities = snap.docs.map(d => {
        const data = d.data();
        delete data._syncedAt;
        return data as DailyActivityLog;
      });
      handlers?.onActivityChange?.(activities);
    }, (err) => console.warn('[Firestore Realtime] Activity stream error:', err));
    unsubscribers.push(unsubAct);

    // 4. Live Workouts stream
    const workoutsCol = collection(firestore, 'users', userId, 'workouts');
    const unsubWorkouts = onSnapshot(workoutsCol, (snap) => {
      const workouts = snap.docs.map(d => {
        const data = d.data();
        delete data._syncedAt;
        return data as WorkoutLog;
      });
      handlers?.onWorkoutsChange?.(workouts);
    }, (err) => console.warn('[Firestore Realtime] Workouts stream error:', err));
    unsubscribers.push(unsubWorkouts);

    // 5. Live Weight Logs stream
    const weightCol = collection(firestore, 'users', userId, 'weightLogs');
    const unsubWeight = onSnapshot(weightCol, (snap) => {
      const weights = snap.docs.map(d => {
        const data = d.data();
        delete data._syncedAt;
        return data as WeightLog;
      });
      handlers?.onWeightChange?.(weights);
    }, (err) => console.warn('[Firestore Realtime] Weight stream error:', err));
    unsubscribers.push(unsubWeight);

    // 6. Live Water Logs stream
    const waterCol = collection(firestore, 'users', userId, 'waterLogs');
    const unsubWater = onSnapshot(waterCol, (snap) => {
      const water = snap.docs.map(d => {
        const data = d.data();
        delete data._syncedAt;
        return data as WaterLog;
      });
      handlers?.onWaterChange?.(water);
    }, (err) => console.warn('[Firestore Realtime] Water stream error:', err));
    unsubscribers.push(unsubWater);

    // 7. Live Medications stream
    const medsCol = collection(firestore, 'users', userId, 'medications');
    const unsubMeds = onSnapshot(medsCol, (snap) => {
      const meds = snap.docs.map(d => {
        const data = d.data();
        delete data._syncedAt;
        return data as Medication;
      });
      handlers?.onMedicationsChange?.(meds);
    }, (err) => console.warn('[Firestore Realtime] Medications stream error:', err));
    unsubscribers.push(unsubMeds);

  } catch (err) {
    console.warn('[Firestore Realtime] Error initializing real-time subscriptions:', err);
  }

  // Cleanup: unsubscribe all listeners
  return () => {
    console.log(`[Firestore Realtime] 🔴 Detaching live listeners for user: ${userId}`);
    unsubscribers.forEach(unsub => {
      try { unsub(); } catch { /* ignore */ }
    });
  };
}
