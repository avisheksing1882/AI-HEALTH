import React, { useState, useEffect } from 'react';
import { 
  Footprints, 
  Play, 
  Pause, 
  MapPin, 
  Sparkles, 
  Navigation, 
  Radio, 
  Gauge, 
  Timer, 
  ShieldCheck
} from 'lucide-react';
import { DailyActivityLog, UserProfile } from '../types';
import { pedometer, GpsTrackingState } from '../services/pedometer';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface StepTrackerCardProps {
  activity: DailyActivityLog;
  profile: UserProfile;
  selectedDate?: string;
  onActivityUpdated: (updated: DailyActivityLog) => void;
}

export const StepTrackerCard: React.FC<StepTrackerCardProps> = ({
  activity,
  profile,
  selectedDate,
  onActivityUpdated,
}) => {
  const [gpsState, setGpsState] = useState<GpsTrackingState>(pedometer.getGpsState());

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = !selectedDate || selectedDate === todayStr;

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    // Only subscribe to live pedometer events when viewing today's activity
    if (!isToday) return;

    const unsubscribe = pedometer.subscribe((newActivity, newGps) => {
      if (newActivity.date === activity.date) {
        onActivityUpdated({
          ...activity,
          steps: newActivity.steps,
          distanceKm: newActivity.distanceKm,
          activeCaloriesBurned: newActivity.activeCaloriesBurned,
          activeMinutes: newActivity.activeMinutes,
          hourlySteps: newActivity.hourlySteps,
          isGoalMet: newActivity.isGoalMet,
          totalCaloriesBurned: newActivity.activeCaloriesBurned + (activity.restingCaloriesBurned || 0),
          waterMl: activity.waterMl,
        });
      }
      if (newGps) {
        setGpsState(newGps);
      }
    });
    return () => unsubscribe();
  }, [isToday, activity.date, activity.waterMl, activity.restingCaloriesBurned, onActivityUpdated]);

  const handleToggleGps = async () => {
    if (!isToday) return;
    soundFx.playTap();
    triggerHaptic();
    pedometer.toggleGpsTracking();
  };

  const pct = Math.min(100, Math.round((activity.steps / Math.max(1, activity.stepGoal)) * 100));

  return (
    <div className="bg-white dark:bg-obsidian-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-500 flex items-center justify-center">
            <Footprints className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              GPS Movement & Step Pedometer
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isToday 
                ? 'Google Fit-grade geodesic distance & real biometric cadence' 
                : `Recorded movement metrics for ${formatDateDisplay(selectedDate!)}`}
            </p>
          </div>
        </div>

        {/* GPS Status Indicator */}
        {isToday ? (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition ${
            gpsState.isActive
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 animate-pulse'
              : 'bg-slate-100 dark:bg-obsidian-800 text-slate-500 border-slate-200 dark:border-slate-700'
          }`}>
            <Radio className="w-3.5 h-3.5" />
            <span>{gpsState.isActive ? 'GPS Active' : 'GPS Idle'}</span>
          </div>
        ) : (
          <span className="text-[10px] uppercase font-bold text-slate-400 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800">
            {activity.steps > 0 ? 'Archived Log' : 'No Activity'}
          </span>
        )}
      </div>

      {/* Main Metric Counter Banner */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-emerald-500/5 to-transparent border border-cyan-500/20">
        <div>
          <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider block mb-0.5">
            {isToday ? 'Total Steps Today' : `Total Steps on ${formatDateDisplay(selectedDate!)}`}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {activity.steps.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-slate-400">
              / {activity.stepGoal.toLocaleString()} goal
            </span>
          </div>
          {activity.steps === 0 && !isToday && (
            <span className="text-xs text-amber-500 dark:text-amber-400 font-medium block mt-1">
              No step movement recorded on this date
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-cyan-500" />
            <span>{activity.distanceKm.toFixed(3)} km</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span>{activity.activeCaloriesBurned} kcal</span>
          </div>
        </div>
      </div>

      {/* Real-time GPS Geolocation Tracker Panel */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-obsidian-950 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-cyan-500" />
              High-Precision Satellite Geolocation
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {gpsState.statusText}
            </p>
          </div>

          <button
            onClick={handleToggleGps}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-95 ${
              gpsState.isActive
                ? 'bg-rose-500 hover:bg-rose-600 text-white'
                : 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-cyan-500/20'
            }`}
          >
            {gpsState.isActive ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause GPS</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start GPS Track</span>
              </>
            )}
          </button>
        </div>

        {/* Live Speed, Pace & Satellite Accuracy Gauges */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="p-2.5 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 uppercase font-semibold mb-0.5">
              <Gauge className="w-3 h-3 text-cyan-500" />
              <span>Speed</span>
            </div>
            <span className="text-base font-black text-slate-900 dark:text-white">
              {gpsState.speedKmh} <span className="text-[10px] font-normal text-slate-400">km/h</span>
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 uppercase font-semibold mb-0.5">
              <Timer className="w-3 h-3 text-emerald-500" />
              <span>Pace</span>
            </div>
            <span className="text-base font-black text-slate-900 dark:text-white">
              {gpsState.paceMinPerKm > 0 ? `${gpsState.paceMinPerKm}` : '—'} <span className="text-[10px] font-normal text-slate-400">min/km</span>
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 uppercase font-semibold mb-0.5">
              <ShieldCheck className="w-3 h-3 text-purple-500" />
              <span>Accuracy</span>
            </div>
            <span className="text-base font-black text-slate-900 dark:text-white">
              {gpsState.accuracyMeters !== null ? `±${gpsState.accuracyMeters}m` : 'Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* Hourly Step Distribution Chart (24 Hours) */}
      <div>
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Hourly Movement Distribution
          </span>
          <span className="text-[11px] text-slate-500">24-hour log</span>
        </div>

        <div className="flex items-end gap-0.5 sm:gap-1 h-20 bg-slate-50 dark:bg-obsidian-950 p-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
          {Array.from({ length: 24 }).map((_, hour) => {
            const stepsInHour = (activity.hourlySteps || {})[hour] || 0;
            const maxHourSteps = 1200;
            const heightPct = Math.min(100, Math.max(8, Math.round((stepsInHour / maxHourSteps) * 100)));
            const isCurrent = hour === new Date().getHours();

            return (
              <div
                key={hour}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                <div
                  className={`w-full rounded-t-sm transition-all duration-300 ${
                    stepsInHour > 0
                      ? isCurrent
                        ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                        : 'bg-cyan-500 dark:bg-cyan-400 opacity-90 hover:opacity-100'
                      : 'bg-slate-200 dark:bg-obsidian-800'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />

                {/* Tooltip */}
                <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                  <div className="bg-slate-900 text-white text-[9px] font-mono py-1 px-1.5 rounded shadow-lg whitespace-nowrap">
                    {hour}:00 &bull; {stepsInHour} steps
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1 font-mono">
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>11 PM</span>
        </div>
      </div>

    </div>
  );
};
