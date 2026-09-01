import React from 'react';
import { LayoutDashboard, Dumbbell, Camera, TrendingUp, Calendar } from 'lucide-react';
import { soundFx } from '../services/soundEffects';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenAIScanner: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenAIScanner,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-obsidian-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800/80 px-2 py-1.5 pb-safe w-full max-w-full overflow-hidden shadow-2xl">
      <div className="flex items-center justify-around w-full max-w-md mx-auto">
        
        {/* Dashboard */}
        <button
          onClick={() => { soundFx.playTap(); onTabChange('dashboard'); }}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition ${
            activeTab === 'dashboard'
              ? 'text-emerald-500 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium">Today</span>
        </button>

        {/* Workouts */}
        <button
          onClick={() => { soundFx.playTap(); onTabChange('workouts'); }}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition ${
            activeTab === 'workouts'
              ? 'text-emerald-500 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Dumbbell className="w-5 h-5" />
          <span className="text-[10px] font-medium">Activity</span>
        </button>

        {/* Center AI Food Lens Camera Button */}
        <div className="relative -top-4">
          <button
            onClick={() => {
              soundFx.playTap();
              onOpenAIScanner();
            }}
            className="w-14 h-14 p-3.5 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 text-white shadow-lg shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center border-4 border-slate-50 dark:border-obsidian-950"
            title="Scan Food with AI"
          >
            <Camera className="w-6 h-6" />
          </button>
        </div>

        {/* Trends */}
        <button
          onClick={() => { soundFx.playTap(); onTabChange('trends'); }}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition ${
            activeTab === 'trends'
              ? 'text-emerald-500 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[10px] font-medium">Trends</span>
        </button>

        {/* History Calendar */}
        <button
          onClick={() => { soundFx.playTap(); onTabChange('calendar'); }}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition ${
            activeTab === 'calendar'
              ? 'text-emerald-500 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-medium">History</span>
        </button>

      </div>
    </div>
  );
};
