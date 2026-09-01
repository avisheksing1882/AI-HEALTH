import { db, getDefaultNotificationRules } from './db';

/**
 * Initializes clean base settings (like notification rules) for a specific user.
 * ZERO fake demo meals, workouts, or step data are generated.
 */
export async function initializeUserDataIfEmpty(userId: string): Promise<void> {
  const existingRules = await db.notificationRules.where('userId').equals(userId).count();
  if (existingRules === 0) {
    const rules = getDefaultNotificationRules(userId);
    await db.notificationRules.bulkPut(rules);
  }
}
