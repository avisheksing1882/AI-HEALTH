import { InAppNotification, NotificationRule, MealType } from '../types';
import { db, getOrCreateDailyActivity, getTodayDateString, getUserProfile } from './db';
import { soundFx } from './soundEffects';

export type NotificationListener = (notifications: InAppNotification[]) => void;

class NotificationManager {
  private currentUserId: string | null = null;
  private listeners: Set<NotificationListener> = new Set();
  private timer: NodeJS.Timeout | null = null;

  public async setContext(userId: string) {
    this.currentUserId = userId;
    await this.refreshNotifications();
    this.startScheduleChecker();
  }

  public reset() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.currentUserId = null;
    this.listeners.clear();
  }

  public subscribe(cb: NotificationListener): () => void {
    this.listeners.add(cb);
    this.refreshNotifications();
    return () => {
      this.listeners.delete(cb);
    };
  }

  private async notifyListeners() {
    if (!this.currentUserId) {
      this.listeners.forEach(cb => cb([]));
      return;
    }
    const list = await db.inAppNotifications
      .where('userId')
      .equals(this.currentUserId)
      .reverse()
      .sortBy('timestamp');
    this.listeners.forEach(cb => cb(list));
  }

  public async refreshNotifications() {
    await this.notifyListeners();
  }

  public async requestBrowserPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return 'denied';
    }
  }

  public getBrowserPermission(): NotificationPermission {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  }

  public async triggerNotification(title: string, message: string, type: InAppNotification['type'] = 'info') {
    if (!this.currentUserId) return;

    const newNotif: InAppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: this.currentUserId,
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };

    await db.inAppNotifications.put(newNotif);
    soundFx.playTap();
    await this.notifyListeners();

    // Show native browser notification if granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.warn('Native notification failed:', e);
      }
    }
  }

  public async markAsRead(id: string) {
    await db.inAppNotifications.update(id, { read: true });
    await this.notifyListeners();
  }

  public async markAllAsRead() {
    if (!this.currentUserId) return;
    const all = await db.inAppNotifications.where('userId').equals(this.currentUserId).toArray();
    for (const notif of all) {
      await db.inAppNotifications.update(notif.id, { read: true });
    }
    await this.notifyListeners();
  }

  public async clearAll() {
    if (!this.currentUserId) return;
    await db.inAppNotifications.where('userId').equals(this.currentUserId).delete();
    await this.notifyListeners();
  }

  public async snoozeRule(ruleId: string, minutes: number = 60) {
    const snoozeTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    await db.notificationRules.update(ruleId, { snoozedUntil: snoozeTime });
  }

  // --- Background Schedule Checker ---
  private startScheduleChecker() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.evaluateRules();
    }, 60000);
    setTimeout(() => this.evaluateRules(), 3000);
  }

  public async evaluateRules() {
    if (!this.currentUserId) return;
    const userId = this.currentUserId;

    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      const today = await getTodayDateString();
      const rules = await db.notificationRules.where('userId').equals(userId).and(r => r.enabled).toArray();
      const user = await getUserProfile(userId);
      if (!user) return;
      const activity = await getOrCreateDailyActivity(userId, today, user);

      for (const rule of rules) {
        if (rule.snoozedUntil && new Date(rule.snoozedUntil) > now) {
          continue;
        }

        if (rule.lastTriggered && rule.lastTriggered.startsWith(today)) {
          const lastHour = new Date(rule.lastTriggered).getHours();
          if (lastHour === currentHour) continue;
        }

        // Evening step catch-up
        if (rule.type === 'workout_reminder' && currentHour >= 20) {
          if (activity.steps < activity.stepGoal * 0.7) {
            const stepsRemaining = activity.stepGoal - activity.steps;
            await this.triggerNotification(
              'Evening Step Goal Catch-Up',
              `You are ${stepsRemaining.toLocaleString()} steps away from your ${activity.stepGoal.toLocaleString()} goal. A 20-minute evening stroll will close your ring!`,
              'reminder'
            );
            await db.notificationRules.update(rule.id, { lastTriggered: now.toISOString() });
          }
        }

        // Meal reminders
        if (rule.type === 'meal_reminder' && rule.mealType) {
          const isTargetTime = Math.abs(this.timeStringToMinutes(rule.time) - this.timeStringToMinutes(currentTimeStr)) <= 15;
          if (isTargetTime) {
            const loggedMeals = await db.meals
              .where('userId')
              .equals(userId)
              .and(m => m.date === today && m.mealType === rule.mealType)
              .count();

            if (loggedMeals === 0) {
              const titles: Record<MealType, string> = {
                breakfast: 'Morning Fuel Log',
                lunch: 'Lunch Nutrition Check',
                dinner: 'Dinner Calorie Log',
                snack: 'Snack Log Reminder'
              };
              await this.triggerNotification(
                titles[rule.mealType] || 'Meal Reminder',
                `Haven't logged ${rule.mealType} yet today. Take a quick photo with the AI Food Lens to balance your macros!`,
                'reminder'
              );
              await db.notificationRules.update(rule.id, { lastTriggered: now.toISOString() });
            }
          }
        }

        // Hydration
        if (rule.type === 'water_reminder' && currentHour >= 9 && currentHour <= 21) {
          if (activity.waterMl < activity.waterGoalMl * (currentHour / 22)) {
            await this.triggerNotification(
              'Hydration Pulse 💧',
              `Time for a refreshing glass of water! Current intake: ${activity.waterMl}ml / ${activity.waterGoalMl}ml goal.`,
              'info'
            );
            await db.notificationRules.update(rule.id, { lastTriggered: now.toISOString() });
          }
        }

        // 7-Day Weekly Weight Check-in
        if (rule.type === 'weekly_summary' || rule.id.includes('weekly')) {
          const latestWeight = await db.weightLogs.where('userId').equals(userId).sortBy('date');
          const lastLog = latestWeight[latestWeight.length - 1];
          const lastDate = lastLog ? new Date(lastLog.date + 'T00:00:00') : new Date('2000-01-01');
          const daysPassed = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysPassed >= 7) {
            await this.triggerNotification(
              'Weekly Weigh-In Check ⚖️',
              `It has been ${daysPassed} days since your last weigh-in. Log your current weight today to update your 7-day progress trend!`,
              'reminder'
            );
            await db.notificationRules.update(rule.id, { lastTriggered: now.toISOString() });
          }
        }
      }
    } catch (err) {
      console.warn('Error evaluating notification rules:', err);
    }
  }

  private timeStringToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
}

export const notificationService = new NotificationManager();
