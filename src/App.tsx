import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  UserProfile, 
  DailyActivityLog, 
  MealLog, 
  WorkoutLog, 
  WeightLog, 
  NutritionInsight,
  AuthSession
} from './types';
import { 
  db, 
  getOrCreateDailyActivity, 
  getTodayDateString, 
  getUserProfile, 
  saveUserProfile, 
  updateDailyActivity,
  saveMealLogWithCache,
  deleteMealLogWithCache,
  saveWorkoutLogWithCache,
  saveWeightLogWithCache,
  syncUserDataWithCache
} from './services/db';
import { pedometer } from './services/pedometer';
import { notificationService } from './services/notificationService';
import { generateNutritionInsights } from './services/nutritionCalculator';
import { soundFx } from './services/soundEffects';
import { authService } from './services/authService';

// Auth Screen
import { AuthScreen } from './components/AuthScreen';

// Components
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { WorkoutsView } from './components/WorkoutsView';
import { AnalyticsView } from './components/AnalyticsView';
import { HistoryCalendarView } from './components/HistoryCalendarView';

// Modals
import { AIFoodScannerModal } from './components/AIFoodScannerModal';
import { FoodLoggerModal } from './components/FoodLoggerModal';
import { WorkoutLoggerModal } from './components/WorkoutLoggerModal';
import { WeightLoggerModal } from './components/WeightLoggerModal';
import { NotificationsCenterModal } from './components/NotificationsCenterModal';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';

/** Confetti celebration helper for goal milestones */
function fireConfetti() {
  try {
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#10B981', '#06B6D4', '#F59E0B', '#8B5CF6', '#EC4899'],
    });
  } catch { /* graceful fallback */ }
}

export function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activity, setActivity] = useState<DailyActivityLog | null>(null);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [insights, setInsights] = useState<NutritionInsight[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workouts' | 'trends' | 'calendar'>('dashboard');

  // Modals state
  const [isAIScannerOpen, setIsAIScannerOpen] = useState(false);
  const [isManualFoodOpen, setIsManualFoodOpen] = useState(false);
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [isNotifsOpen, setIsNotifsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Theme
  const [isDark, setIsDark] = useState(true);

  // Track whether we already fired confetti this session
  const [hasCelebrated, setHasCelebrated] = useState(false);

  // Initial Boot & Session Check
  useEffect(() => {
    async function boot() {
      const activeSession = authService.restoreSession();
      if (activeSession) {
        setSession(activeSession);
        await syncUserDataWithCache(activeSession.userId);
        const user = await getUserProfile(activeSession.userId);
        if (user) {
          setProfile(user);
          setIsDark(user.theme !== 'light');
          soundFx.setMuted(!user.soundEnabled);

          await pedometer.setContext(user.id, user);
          await notificationService.setContext(user.id);

          const streak = await pedometer.calculateStreak(user.id);
          setStreakCount(streak);
        } else {
          // If session exists but profile was purged, clear session
          authService.logout();
          setSession(null);
        }
      }

      setIsBooting(false);
    }
    boot();
  }, []);

  // Subscribe to notification listener when user is active
  useEffect(() => {
    if (!profile) return;
    const notifsUnsub = notificationService.subscribe(list => {
      setUnreadNotifs(list.filter(n => !n.read).length);
    });
    return () => notifsUnsub();
  }, [profile?.id]);

  // Fire confetti when step goal is first reached in this session
  useEffect(() => {
    if (activity && activity.isGoalMet && !hasCelebrated) {
      setHasCelebrated(true);
      fireConfetti();
    }
  }, [activity?.isGoalMet, hasCelebrated]);

  // Sync theme with HTML class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Load Date Specific Data whenever selectedDate or profile changes
  useEffect(() => {
    async function loadDateData() {
      if (!profile) return;
      const userId = profile.id;

      const act = await getOrCreateDailyActivity(userId, selectedDate, profile);
      const m = await db.meals
        .where('userId')
        .equals(userId)
        .and(item => item.date === selectedDate)
        .toArray();

      const w = await db.workouts
        .where('userId')
        .equals(userId)
        .and(item => item.date === selectedDate)
        .toArray();

      setActivity(act);
      setMeals(m);
      setWorkouts(w);

      const genInsights = generateNutritionInsights(m, act, profile);
      setInsights(genInsights);

      const streak = await pedometer.calculateStreak(userId);
      setStreakCount(streak);
    }
    loadDateData();
  }, [selectedDate, profile]);

  // Auth Handlers
  const handleLoginSuccess = async (newSession: AuthSession, newProfile: UserProfile) => {
    // 1. Immediately hydrate user-specific daily activity, meals, and workouts
    const userId = newProfile.id;
    const act = await getOrCreateDailyActivity(userId, selectedDate, newProfile);
    const m = await db.meals
      .where('userId')
      .equals(userId)
      .and(item => item.date === selectedDate)
      .toArray();

    const w = await db.workouts
      .where('userId')
      .equals(userId)
      .and(item => item.date === selectedDate)
      .toArray();

    const genInsights = generateNutritionInsights(m, act, newProfile);
    const streak = await pedometer.calculateStreak(newProfile.id);

    // 2. Set all states simultaneously
    setSession(newSession);
    setProfile(newProfile);
    setActivity(act);
    setMeals(m);
    setWorkouts(w);
    setInsights(genInsights);
    setStreakCount(streak);
    setIsDark(newProfile.theme !== 'light');
    soundFx.setMuted(!newProfile.soundEnabled);

    // 3. Initialize pedometer & notifications in background
    await pedometer.setContext(newProfile.id, newProfile);
    await notificationService.setContext(newProfile.id);
  };

  const handleLogout = () => {
    soundFx.playTap();
    authService.logout();
    pedometer.reset();
    notificationService.reset();
    setSession(null);
    setProfile(null);
    setActivity(null);
    setMeals([]);
    setWorkouts([]);
    setInsights([]);
    setActiveTab('dashboard');
  };

  const handleToggleTheme = async () => {
    if (!profile) return;
    const nextDark = !isDark;
    setIsDark(nextDark);
    const updated = await saveUserProfile(profile.id, { theme: nextDark ? 'dark' : 'light' });
    setProfile(updated);
  };

  const handleMealSaved = async (newMeal: MealLog) => {
    if (!profile) return;
    await saveMealLogWithCache(newMeal);
    const updatedMeals = [...meals, newMeal];
    setMeals(updatedMeals);

    if (activity) {
      const genInsights = generateNutritionInsights(updatedMeals, activity, profile);
      setInsights(genInsights);
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!profile) return;
    await deleteMealLogWithCache(profile.id, mealId);
    const updated = meals.filter(m => m.id !== mealId);
    setMeals(updated);

    if (activity) {
      const genInsights = generateNutritionInsights(updated, activity, profile);
      setInsights(genInsights);
    }
  };

  const handleWorkoutSaved = async (newWorkout: WorkoutLog) => {
    if (!profile) return;
    await saveWorkoutLogWithCache(newWorkout);
    const updatedWorkouts = [...workouts, newWorkout];
    setWorkouts(updatedWorkouts);

    // Add calories and duration to daily activity
    if (activity) {
      const updated = await updateDailyActivity(profile.id, selectedDate, {
        activeMinutes: activity.activeMinutes + newWorkout.durationMinutes,
        activeCaloriesBurned: activity.activeCaloriesBurned + newWorkout.caloriesBurned,
      });
      setActivity(updated);
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    if (!profile) return;
    const target = workouts.find(w => w.id === workoutId);
    await db.workouts.delete(workoutId);
    const updated = workouts.filter(w => w.id !== workoutId);
    setWorkouts(updated);

    if (activity && target) {
      const updatedAct = await updateDailyActivity(profile.id, selectedDate, {
        activeMinutes: Math.max(0, activity.activeMinutes - target.durationMinutes),
        activeCaloriesBurned: Math.max(0, activity.activeCaloriesBurned - target.caloriesBurned),
      });
      setActivity(updatedAct);
    }
  };

  const handleWeightSaved = async (weightLog: WeightLog) => {
    if (!profile) return;
    await saveWeightLogWithCache(weightLog);
    const updatedProfile = await saveUserProfile(profile.id, { weightKg: weightLog.weightKg });
    setProfile(updatedProfile);

    if (activity) {
      const updatedAct = await updateDailyActivity(profile.id, selectedDate, { weightKg: weightLog.weightKg });
      setActivity(updatedAct);
    }
  };

  const handleWaterUpdated = async (amountMl: number) => {
    if (!profile) return;
    const cleanAmount = Math.max(0, amountMl);
    pedometer.syncWater(cleanAmount);
    // Immediate optimistic state update
    setActivity(prev => prev ? { ...prev, waterMl: cleanAmount } : prev);
    const updated = await updateDailyActivity(profile.id, selectedDate, { waterMl: cleanAmount });
    setActivity(updated);
  };

  const handleLogWaterDelta = async (deltaMl: number) => {
    if (!profile || !activity) return;
    const newTotal = Math.max(0, (activity.waterMl || 0) + deltaMl);
    const now = new Date();
    try {
      await db.waterLogs.put({
        id: `water-${Date.now()}`,
        userId: profile.id,
        date: selectedDate,
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        amountMl: deltaMl
      });
    } catch {
      // Ignored
    }

    await notificationService.logWaterIntake(deltaMl, newTotal, activity.waterGoalMl || 3000);
  };

  const handleActivityUpdated = (updatedAct: DailyActivityLog) => {
    setActivity(updatedAct);
    if (profile && meals.length > 0) {
      const genInsights = generateNutritionInsights(meals, updatedAct, profile);
      setInsights(genInsights);
    }
  };

  // 1. Loading Splash Screen during Initial Session Boot
  if (isBooting) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-obsidian-950">
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/30 animate-ping" />
          <div className="absolute inset-2 rounded-full border-4 border-cyan-400/50 animate-pulse" />
          <div className="absolute inset-4 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        </div>
        <h2 className="text-lg font-semibold text-white mb-1">VitalTrack AI</h2>
        <p className="text-sm text-slate-400">Loading your private health vault…</p>
      </div>
    );
  }

  // 2. Unauthenticated State: Show Google One-Click Auth Screen
  if (!session || !profile) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // 3. Authenticated State: Show Full Private Health Dashboard
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-obsidian-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors pb-24 md:pb-8 w-full max-w-full overflow-x-hidden">
      
      {/* Top Navbar */}
      <Navbar
        profile={profile}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        streakCount={streakCount}
        unreadNotifsCount={unreadNotifs}
        onOpenNotifications={() => setIsNotifsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t as typeof activeTab)}
      />

      {/* Main Container View */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 w-full max-w-full overflow-x-hidden">
        {activity && (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                profile={profile}
                activity={activity}
                meals={meals}
                workouts={workouts}
                insights={insights}
                onOpenAIScanner={() => setIsAIScannerOpen(true)}
                onOpenManualFoodLogger={() => setIsManualFoodOpen(true)}
                onOpenWorkoutModal={() => setIsWorkoutModalOpen(true)}
                onOpenWeightModal={() => setIsWeightModalOpen(true)}
                onActivityUpdated={handleActivityUpdated}
                onWaterUpdated={handleWaterUpdated}
                onLogWaterDelta={handleLogWaterDelta}
                onDeleteMeal={handleDeleteMeal}
              />
            )}

            {activeTab === 'workouts' && (
              <WorkoutsView
                workouts={workouts}
                activity={activity}
                profile={profile}
                onOpenWorkoutModal={() => setIsWorkoutModalOpen(true)}
                onDeleteWorkout={handleDeleteWorkout}
                onActivityUpdated={handleActivityUpdated}
              />
            )}

            {activeTab === 'trends' && (
              <AnalyticsView profile={profile} />
            )}

            {activeTab === 'calendar' && (
              <HistoryCalendarView
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                profile={profile}
                onOpenAIScanner={() => setIsAIScannerOpen(true)}
                onOpenWorkoutModal={() => setIsWorkoutModalOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t as typeof activeTab)}
        onOpenAIScanner={() => setIsAIScannerOpen(true)}
      />

      {/* Interactive Modals */}
      <AIFoodScannerModal
        isOpen={isAIScannerOpen}
        onClose={() => setIsAIScannerOpen(false)}
        onMealSaved={handleMealSaved}
        profile={profile}
        selectedDate={selectedDate}
      />

      <FoodLoggerModal
        isOpen={isManualFoodOpen}
        onClose={() => setIsManualFoodOpen(false)}
        onMealSaved={handleMealSaved}
        selectedDate={selectedDate}
        profile={profile}
      />

      <WorkoutLoggerModal
        isOpen={isWorkoutModalOpen}
        onClose={() => setIsWorkoutModalOpen(false)}
        onWorkoutSaved={handleWorkoutSaved}
        selectedDate={selectedDate}
        profile={profile}
      />

      <WeightLoggerModal
        isOpen={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        onWeightSaved={handleWeightSaved}
        selectedDate={selectedDate}
        profile={profile}
      />

      <NotificationsCenterModal
        isOpen={isNotifsOpen}
        onClose={() => setIsNotifsOpen(false)}
        profile={profile}
      />

      <ProfileSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        onProfileUpdated={setProfile}
        onLogout={handleLogout}
      />

    </div>
  );
}

export default App;
