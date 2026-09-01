import React, { useState } from 'react';
import { 
  Flame, 
  Bell, 
  Moon, 
  Sun, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Activity,
  LogOut
} from 'lucide-react';
import { soundFx } from '../services/soundEffects';
import { UserProfile } from '../types';
import { DatePickerModal } from './DatePickerModal';

interface NavbarProps {
  profile: UserProfile;
  selectedDate: string;
  onDateChange: (date: string) => void;
  streakCount: number;
  unreadNotifsCount: number;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  selectedDate,
  onDateChange,
  streakCount,
  unreadNotifsCount,
  onOpenNotifications,
  onOpenSettings,
  onLogout,
  isDark,
  onToggleTheme,
  activeTab,
  onTabChange,
}) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const handlePrevDay = () => {
    soundFx.playTap();
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    soundFx.playTap();
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const isTodayDate = d.toDateString() === today.toDateString();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isTodayDate) return 'Today, ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (isYesterday) return 'Yesterday, ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <>
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/90 dark:bg-obsidian-950/90 border-b border-slate-200 dark:border-slate-800/80 transition-colors w-full max-w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          
          {/* Main Navbar Row */}
          <div className="flex items-center justify-between h-12 sm:h-16 gap-2">
            
            {/* App Brand */}
            <div 
              className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0" 
              onClick={() => onTabChange('dashboard')}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-0.5 shadow-md shadow-emerald-500/20 flex items-center justify-center">
                <div className="w-full h-full bg-white dark:bg-obsidian-950 rounded-[10px] sm:rounded-[14px] flex items-center justify-center">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 dark:text-emerald-400 animate-pulse-subtle" />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-slate-900 via-emerald-600 to-cyan-600 dark:from-white dark:via-emerald-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  VitalTrack
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  AI
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-obsidian-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => { soundFx.playTap(); onTabChange('dashboard'); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-white dark:bg-obsidian-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => { soundFx.playTap(); onTabChange('workouts'); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'workouts'
                    ? 'bg-white dark:bg-obsidian-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Workouts & Steps
              </button>
              <button
                onClick={() => { soundFx.playTap(); onTabChange('trends'); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'trends'
                    ? 'bg-white dark:bg-obsidian-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Analytics & Trends
              </button>
              <button
                onClick={() => { soundFx.playTap(); onTabChange('calendar'); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'calendar'
                    ? 'bg-white dark:bg-obsidian-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                History
              </button>
            </nav>

            {/* Desktop Date Selector Pill */}
            <div className="hidden md:flex items-center bg-slate-100 dark:bg-obsidian-900/90 rounded-xl p-1 border border-slate-200 dark:border-slate-800">
              <button
                onClick={handlePrevDay}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-obsidian-800 text-slate-600 dark:text-slate-400 transition"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => { soundFx.playTap(); setIsDatePickerOpen(true); }}
                className="px-2.5 py-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-500 transition rounded-lg hover:bg-white dark:hover:bg-obsidian-800"
                title="Click to choose a date"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDateDisplay(selectedDate)}</span>
              </button>
              <button
                onClick={handleNextDay}
                disabled={isToday}
                className={`p-1 rounded-lg transition ${
                  isToday 
                    ? 'opacity-30 cursor-not-allowed text-slate-400' 
                    : 'hover:bg-white dark:hover:bg-obsidian-800 text-slate-600 dark:text-slate-400'
                }`}
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right Action Icons */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              
              {/* Streak Badge */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-orange-500/10 dark:bg-orange-950/40 border border-orange-500/20 text-orange-500 font-bold text-xs shadow-sm">
                <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-orange-500" />
                <span>{streakCount}d</span>
              </div>

              {/* Notification Bell */}
              <button
                onClick={() => { soundFx.playTap(); onOpenNotifications(); }}
                className="relative p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-obsidian-900 hover:bg-slate-200 dark:hover:bg-obsidian-800 text-slate-600 dark:text-slate-400 transition"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                  </span>
                )}
              </button>

              {/* Theme Toggle */}
              <button
                onClick={() => { soundFx.playTap(); onToggleTheme(); }}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-obsidian-900 hover:bg-slate-200 dark:hover:bg-obsidian-800 text-slate-600 dark:text-slate-400 transition"
                title="Toggle Theme"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>

              {/* Settings / Profile */}
              <button
                onClick={() => { soundFx.playTap(); onOpenSettings(); }}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-obsidian-900 hover:bg-slate-200 dark:hover:bg-obsidian-800 text-slate-600 dark:text-slate-400 transition flex items-center gap-1.5"
                title="Profile & Settings"
              >
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <Settings className="w-4 h-4" />
                )}
              </button>

              {/* Sign Out Button (Desktop) */}
              <button
                onClick={() => { soundFx.playTap(); onLogout(); }}
                className="hidden lg:flex items-center gap-1 p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition text-xs font-semibold"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>

          </div>

          {/* Mobile Sub-Row Date Selector Bar */}
          <div className="md:hidden pb-1.5 pt-0.5 flex items-center justify-center">
            <div className="flex items-center justify-between w-full max-w-sm bg-slate-100/90 dark:bg-obsidian-900/90 rounded-xl p-1 border border-slate-200 dark:border-slate-800 shadow-inner">
              <button
                onClick={handlePrevDay}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-obsidian-800 text-slate-600 dark:text-slate-400 transition"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => { soundFx.playTap(); setIsDatePickerOpen(true); }}
                className="px-3 py-0.5 flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-emerald-500 transition"
                title="Click to choose a date"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span>{formatDateDisplay(selectedDate)}</span>
              </button>
              <button
                onClick={handleNextDay}
                disabled={isToday}
                className={`p-1.5 rounded-lg transition ${
                  isToday 
                    ? 'opacity-30 cursor-not-allowed text-slate-400' 
                    : 'hover:bg-white dark:hover:bg-obsidian-800 text-slate-600 dark:text-slate-400'
                }`}
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Quick Interactive Date Picker Modal */}
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={onDateChange}
      />
    </>
  );
};
