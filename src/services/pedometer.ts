import { DailyActivityLog, UserProfile } from '../types';
import { db, getOrCreateDailyActivity, getTodayDateString, updateDailyActivity } from './db';
import { 
  calculateHaversineDistanceKm, 
  calculateStepCalories, 
  calculateStrideLengthM 
} from './nutritionCalculator';
import { soundFx, triggerHaptic } from './soundEffects';

export interface GpsTrackingState {
  isActive: boolean;
  accuracyMeters: number | null;
  speedKmh: number;
  paceMinPerKm: number;
  latitude: number | null;
  longitude: number | null;
  totalGpsDistanceKm: number;
  lastFixTimestamp: number;
  statusText: string;
}

export type PedometerCallback = (activity: DailyActivityLog, gpsState?: GpsTrackingState) => void;

class HighPrecisionMovementTracker {
  private currentUserId: string | null = null;
  private profile: UserProfile | null = null;
  private currentActivity: DailyActivityLog | null = null;
  private subscribers: Set<PedometerCallback> = new Set();

  // --- Real-time GPS Geolocation Tracking ---
  private gpsWatchId: number | null = null;
  private lastGpsCoords: { lat: number; lon: number; time: number } | null = null;
  private gpsState: GpsTrackingState = {
    isActive: false,
    accuracyMeters: null,
    speedKmh: 0,
    paceMinPerKm: 0,
    latitude: null,
    longitude: null,
    totalGpsDistanceKm: 0,
    lastFixTimestamp: 0,
    statusText: 'GPS Inactive (Tap to Track Movement)'
  };

  // --- Real Physical Accelerometer Sensor ---
  private isMotionListening = false;
  private lastStepTimestamp = 0;
  private lastAccel = { x: 0, y: 0, z: 0 };
  private accelThreshold = 11.8; // m/s^2 peak threshold

  // --- User Context Lifecycle ---
  public async setContext(userId: string, profile: UserProfile) {
    this.currentUserId = userId;
    this.profile = profile;
    const today = await getTodayDateString();
    this.currentActivity = await getOrCreateDailyActivity(userId, today, profile);
    this.notifySubscribers();
  }

  public reset() {
    this.stopGpsTracking();
    this.stopRealSensor();
    this.currentUserId = null;
    this.profile = null;
    this.currentActivity = null;
    this.subscribers.clear();
  }

  public subscribe(cb: PedometerCallback): () => void {
    this.subscribers.add(cb);
    if (this.currentActivity) {
      cb(this.currentActivity, this.gpsState);
    }
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notifySubscribers() {
    if (this.currentActivity) {
      this.subscribers.forEach(cb => cb(this.currentActivity!, this.gpsState));
    }
  }

  public getGpsState(): GpsTrackingState {
    return { ...this.gpsState };
  }

  // ==========================================
  // 🛰️ REAL HIGH-PRECISION GPS GEOLOCATION ENGINE
  // ==========================================

  public async startGpsTracking(): Promise<boolean> {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      this.gpsState.statusText = 'Geolocation API not supported in this browser';
      this.notifySubscribers();
      return false;
    }

    if (this.gpsWatchId !== null) return true; // Already active

    this.gpsState.isActive = true;
    this.gpsState.statusText = 'Acquiring high-precision GPS lock…';
    this.notifySubscribers();

    this.gpsWatchId = navigator.geolocation.watchPosition(
      (position) => this.handleGpsPositionUpdate(position),
      (error) => this.handleGpsError(error),
      {
        enableHighAccuracy: true, // Uses real GPS satellite hardware on mobile
        maximumAge: 1000,         // Cache max 1s for live velocity
        timeout: 15000            // 15s timeout
      }
    );

    // Also start device motion accelerometer sensor alongside GPS
    await this.startRealSensor();

    return true;
  }

  public stopGpsTracking() {
    if (this.gpsWatchId !== null && typeof window !== 'undefined') {
      navigator.geolocation.clearWatch(this.gpsWatchId);
      this.gpsWatchId = null;
    }
    this.lastGpsCoords = null;
    this.gpsState.isActive = false;
    this.gpsState.statusText = 'GPS Tracking Paused';
    this.notifySubscribers();
  }

  public toggleGpsTracking(): boolean {
    if (this.gpsState.isActive) {
      this.stopGpsTracking();
      return false;
    } else {
      this.startGpsTracking();
      return true;
    }
  }

  private handleGpsPositionUpdate(position: GeolocationPosition) {
    const { latitude, longitude, accuracy, speed } = position.coords;
    const now = position.timestamp || Date.now();

    this.gpsState.latitude = latitude;
    this.gpsState.longitude = longitude;
    this.gpsState.accuracyMeters = Math.round(accuracy);
    this.gpsState.lastFixTimestamp = now;

    // Reject low-accuracy signals (accuracy > 25m is noisy/cellular triangulated)
    if (accuracy > 30) {
      this.gpsState.statusText = `Weak GPS Signal (±${Math.round(accuracy)}m). Moving to open area…`;
      this.notifySubscribers();
      return;
    }

    if (!this.lastGpsCoords) {
      // First high-precision fix established
      this.lastGpsCoords = { lat: latitude, lon: longitude, time: now };
      this.gpsState.statusText = `Precision GPS Locked (±${Math.round(accuracy)}m)`;
      this.notifySubscribers();
      return;
    }

    // Compute geodesic displacement using Haversine formula
    const deltaKm = calculateHaversineDistanceKm(
      this.lastGpsCoords.lat,
      this.lastGpsCoords.lon,
      latitude,
      longitude
    );

    const deltaMeters = deltaKm * 1000.0;
    const timeElapsedSec = (now - this.lastGpsCoords.time) / 1000.0;

    // Filter out GPS stationary jitter (displacement < 2.5 meters)
    if (deltaMeters < 2.5) {
      this.gpsState.statusText = `GPS Active (Stationary / High Accuracy ±${Math.round(accuracy)}m)`;
      this.notifySubscribers();
      return;
    }

    // Velocity in m/s
    const calculatedSpeedMps = timeElapsedSec > 0 ? deltaMeters / timeElapsedSec : (speed || 0);
    const speedKmh = Math.round(calculatedSpeedMps * 3.6 * 10) / 10;

    // Filter out non-human vehicle speeds (> 18 km/h is driving, not walking/jogging)
    if (speedKmh > 18.0) {
      this.gpsState.statusText = `Vehicle Speed Detected (${speedKmh} km/h). Pausing step calculation.`;
      this.notifySubscribers();
      this.lastGpsCoords = { lat: latitude, lon: longitude, time: now };
      return;
    }

    // Valid human movement detected!
    this.lastGpsCoords = { lat: latitude, lon: longitude, time: now };
    this.gpsState.speedKmh = speedKmh;
    this.gpsState.totalGpsDistanceKm += deltaKm;
    this.gpsState.paceMinPerKm = speedKmh > 0.5 ? Math.round((60 / speedKmh) * 10) / 10 : 0;
    this.gpsState.statusText = `Tracking Movement: ${speedKmh} km/h (±${Math.round(accuracy)}m)`;

    // Convert GPS distance into exact biometric steps using stride length
    const strideLengthM = this.profile
      ? calculateStrideLengthM(this.profile.heightCm, this.profile.gender)
      : 0.72; // default 72cm stride

    const stepsFromGps = Math.max(1, Math.round(deltaMeters / strideLengthM));
    this.recordMovement(stepsFromGps, deltaKm);
  }

  private handleGpsError(error: GeolocationPositionError) {
    console.warn('GPS Geolocation Error:', error.message);
    this.gpsState.isActive = false;
    switch (error.code) {
      case error.PERMISSION_DENIED:
        this.gpsState.statusText = 'Location permission denied. Enable location in browser settings.';
        break;
      case error.POSITION_UNAVAILABLE:
        this.gpsState.statusText = 'GPS position unavailable. Moving to an open view of the sky…';
        break;
      case error.TIMEOUT:
        this.gpsState.statusText = 'GPS signal acquisition timed out. Retrying…';
        break;
      default:
        this.gpsState.statusText = `GPS Error: ${error.message}`;
    }
    this.notifySubscribers();
  }

  // ==========================================
  // 📱 REAL PHYSICAL ACCELEROMETER SENSOR
  // ==========================================

  public async startRealSensor() {
    if (typeof window === 'undefined') return;

    // Check iOS 13+ permission
    const DeviceMotionEventTyped = window.DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DeviceMotionEventTyped?.requestPermission === 'function') {
      try {
        const permission = await DeviceMotionEventTyped.requestPermission();
        if (permission !== 'granted') {
          console.warn('Device motion permission denied');
          return;
        }
      } catch (err) {
        console.warn('Error requesting device motion permission:', err);
      }
    }

    if ('ondevicemotion' in window && !this.isMotionListening) {
      this.isMotionListening = true;
      window.addEventListener('devicemotion', this.handleDeviceMotion, true);
    }
  }

  public stopRealSensor() {
    if (typeof window !== 'undefined' && this.isMotionListening) {
      window.removeEventListener('devicemotion', this.handleDeviceMotion, true);
      this.isMotionListening = false;
    }
  }

  private handleDeviceMotion = (event: DeviceMotionEvent) => {
    const accel = event.accelerationIncludingGravity || event.acceleration;
    if (!accel || accel.x === null || accel.y === null || accel.z === null) return;

    const currentAccel = { x: accel.x, y: accel.y, z: accel.z };
    const magnitude = Math.sqrt(
      currentAccel.x * currentAccel.x +
      currentAccel.y * currentAccel.y +
      currentAccel.z * currentAccel.z
    );

    const now = Date.now();
    // Peak detection with refractory debounce period (320ms ~ max 185 steps/min)
    if (magnitude > this.accelThreshold && now - this.lastStepTimestamp > 320) {
      this.lastStepTimestamp = now;

      // Only increment if GPS is not simultaneously recording to prevent duplicate steps
      if (!this.gpsState.isActive) {
        const strideLengthM = this.profile
          ? calculateStrideLengthM(this.profile.heightCm, this.profile.gender)
          : 0.72;
        const distKm = strideLengthM / 1000.0;
        this.recordMovement(1, distKm);
      }
    }

    this.lastAccel = currentAccel;
  };

  // ==========================================
  // 📊 PRECISION MET MOVEMENT RECORDER
  // ==========================================

  private async recordMovement(stepIncrement: number, distanceKmIncrement: number) {
    if (!this.currentUserId || !this.profile) return;
    const userId = this.currentUserId;
    const today = await getTodayDateString();
    const current = this.currentActivity || await getOrCreateDailyActivity(userId, today, this.profile);

    const newSteps = current.steps + stepIncrement;
    const newDist = Math.round((current.distanceKm + distanceKmIncrement) * 1000) / 1000;
    const newActiveKcal = calculateStepCalories(newSteps, this.profile.weightKg);
    const activeMins = Math.round(newSteps / 110);
    const currentHour = new Date().getHours();

    const hourly = { ...(current.hourlySteps || {}) };
    hourly[currentHour] = (hourly[currentHour] || 0) + stepIncrement;

    const wasGoalMet = current.isGoalMet;
    const nowGoalMet = newSteps >= current.stepGoal;

    if (!wasGoalMet && nowGoalMet) {
      soundFx.playRingCelebration();
      triggerHaptic();
    }

    this.currentActivity = {
      ...current,
      steps: newSteps,
      distanceKm: newDist,
      activeCaloriesBurned: newActiveKcal,
      activeMinutes: activeMins,
      hourlySteps: hourly,
      isGoalMet: nowGoalMet,
      updatedAt: new Date().toISOString()
    };

    this.notifySubscribers();
    this.scheduleDbSave();
  }

  private dbSaveTimer: NodeJS.Timeout | null = null;
  private scheduleDbSave() {
    if (this.dbSaveTimer || !this.currentUserId || !this.currentActivity) return;
    this.dbSaveTimer = setTimeout(async () => {
      if (this.currentUserId && this.currentActivity) {
        await updateDailyActivity(this.currentUserId, this.currentActivity.date, this.currentActivity);
      }
      this.dbSaveTimer = null;
    }, 1500);
  }

  // --- Streak Calculator ---
  public async calculateStreak(userId: string): Promise<number> {
    try {
      const allActivities = await db.dailyActivity
        .where('userId')
        .equals(userId)
        .sortBy('date');

      if (allActivities.length === 0) return 0;

      const reversed = allActivities.reverse();
      let streak = 0;
      const today = await getTodayDateString();

      for (let i = 0; i < reversed.length; i++) {
        const item = reversed[i];
        if (item.date === today) {
          if (item.isGoalMet) streak++;
          continue;
        }

        if (item.isGoalMet) {
          streak++;
        } else {
          break;
        }
      }
      return streak;
    } catch {
      return 0;
    }
  }
}

export const pedometer = new HighPrecisionMovementTracker();
