import React from 'react';
import { Flame, Dumbbell, Footprints } from 'lucide-react';

interface ActivityRingsProps {
  moveCalories: number;
  moveGoal: number;
  exerciseMinutes: number;
  exerciseGoal: number;
  steps: number;
  stepGoal: number;
  size?: number;
  strokeWidth?: number;
  showLabels?: boolean;
}

export const ActivityRings: React.FC<ActivityRingsProps> = ({
  moveCalories,
  moveGoal,
  exerciseMinutes,
  exerciseGoal,
  steps,
  stepGoal,
  size = 200,
  strokeWidth = 14,
  showLabels = true,
}) => {
  const center = size / 2;
  const gap = 3;

  // Radii for outer to inner rings
  const r1 = center - strokeWidth / 2 - 4; // Move (Red/Orange)
  const r2 = r1 - strokeWidth - gap;      // Exercise (Green)
  const r3 = r2 - strokeWidth - gap;      // Steps/Stand (Cyan/Blue)

  const circ1 = 2 * Math.PI * r1;
  const circ2 = 2 * Math.PI * r2;
  const circ3 = 2 * Math.PI * r3;

  const pct1 = Math.min(2.0, moveCalories / Math.max(1, moveGoal));
  const pct2 = Math.min(2.0, exerciseMinutes / Math.max(1, exerciseGoal));
  const pct3 = Math.min(2.0, steps / Math.max(1, stepGoal));

  const offset1 = circ1 - Math.min(1, pct1) * circ1;
  const offset2 = circ2 - Math.min(1, pct2) * circ2;
  const offset3 = circ3 - Math.min(1, pct3) * circ3;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <defs>
            <linearGradient id="moveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FA5D29" />
              <stop offset="100%" stopColor="#FF2A6D" />
            </linearGradient>
            <linearGradient id="exerciseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
            <linearGradient id="stepsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>

          {/* Background Track Rings */}
          <circle
            cx={center}
            cy={center}
            r={r1}
            stroke="#27191C"
            strokeWidth={strokeWidth}
            fill="none"
            className="opacity-40"
          />
          <circle
            cx={center}
            cy={center}
            r={r2}
            stroke="#12251D"
            strokeWidth={strokeWidth}
            fill="none"
            className="opacity-40"
          />
          <circle
            cx={center}
            cy={center}
            r={r3}
            stroke="#102533"
            strokeWidth={strokeWidth}
            fill="none"
            className="opacity-40"
          />

          {/* Active Animated Rings */}
          <circle
            cx={center}
            cy={center}
            r={r1}
            stroke="url(#moveGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circ1}
            strokeDashoffset={offset1}
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-1000 ease-out"
          />
          <circle
            cx={center}
            cy={center}
            r={r2}
            stroke="url(#exerciseGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circ2}
            strokeDashoffset={offset2}
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-1000 ease-out"
          />
          <circle
            cx={center}
            cy={center}
            r={r3}
            stroke="url(#stepsGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circ3}
            strokeDashoffset={offset3}
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Ring Icon/Metrics */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            {Math.round(pct1 * 100)}%
          </span>
          <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
            Daily Activity
          </span>
        </div>
      </div>

      {showLabels && (
        <div className="grid grid-cols-3 gap-3 w-full mt-4 text-xs">
          <div className="flex items-center gap-2 bg-rose-500/10 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-500/20">
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-500">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {moveCalories} <span className="text-[10px] text-slate-500 font-normal">/ {moveGoal}</span>
              </div>
              <div className="text-[10px] text-rose-500 font-medium">Active kcal</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/10 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/20">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {exerciseMinutes} <span className="text-[10px] text-slate-500 font-normal">/ {exerciseGoal}</span>
              </div>
              <div className="text-[10px] text-emerald-500 font-medium">Exercise min</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-cyan-500/10 dark:bg-cyan-950/30 p-2.5 rounded-xl border border-cyan-500/20">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-500">
              <Footprints className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {steps.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">/ {stepGoal.toLocaleString()}</span>
              </div>
              <div className="text-[10px] text-cyan-500 font-medium">Steps</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
