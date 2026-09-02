import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Volume2, 
  Droplet, 
  Utensils, 
  Dumbbell, 
  Pill, 
  Check, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { InAppNotification } from '../types';
import { notificationService } from '../services/notificationService';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface ActiveToast extends InAppNotification {
  toastKey: string;
  createdAtMs: number;
}

interface ReminderToastContainerProps {
  onQuickAction?: (actionLabel: string, notif: InAppNotification) => void;
}

export const ReminderToastContainer: React.FC<ReminderToastContainerProps> = ({
  onQuickAction
}) => {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  useEffect(() => {
    const unsub = notificationService.subscribeToToasts((notif) => {
      const activeItem: ActiveToast = {
        ...notif,
        toastKey: `${notif.id}-${Date.now()}`,
        createdAtMs: Date.now()
      };

      setToasts(prev => [activeItem, ...prev.slice(0, 2)]); // keep max 3 visible

      // Auto dismiss after 7 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.toastKey !== activeItem.toastKey));
      }, 7000);
    });

    return () => unsub();
  }, []);

  const handleDismiss = (toastKey: string) => {
    soundFx.playTap();
    setToasts(prev => prev.filter(t => t.toastKey !== toastKey));
  };

  const handleReplaySound = (title: string, message: string) => {
    soundFx.playReminderSoundForType(title + ' ' + message);
    triggerHaptic();
  };

  const getToastIcon = (title: string, type: InAppNotification['type']) => {
    const lower = title.toLowerCase();
    if (lower.includes('water') || lower.includes('hydration')) {
      return <Droplet className="w-5 h-5 text-cyan-500 animate-bounce" />;
    }
    if (lower.includes('meal') || lower.includes('fuel') || lower.includes('lunch') || lower.includes('dinner') || lower.includes('breakfast')) {
      return <Utensils className="w-5 h-5 text-amber-500" />;
    }
    if (lower.includes('medication') || lower.includes('pill')) {
      return <Pill className="w-5 h-5 text-rose-500" />;
    }
    if (lower.includes('step') || lower.includes('walk') || lower.includes('workout') || lower.includes('exercise')) {
      return <Dumbbell className="w-5 h-5 text-emerald-500" />;
    }
    return <Bell className="w-5 h-5 text-emerald-500" />;
  };

  if (toasts.length === 0) return null;

  return (
    <div 
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] pointer-events-none"
      aria-live="polite"
    >
      {toasts.map(toast => (
        <div
          key={toast.toastKey}
          className="pointer-events-auto bg-white/95 dark:bg-obsidian-900/95 backdrop-blur-xl border border-emerald-500/30 dark:border-emerald-500/40 rounded-3xl p-4 shadow-2xl shadow-emerald-500/10 flex items-start gap-3.5 transition-all transform animate-in slide-in-from-top-4 duration-300 relative overflow-hidden"
        >
          {/* Top subtle glow progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 animate-pulse" />

          {/* Left Icon with chime ring badge */}
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
            {getToastIcon(toast.title, toast.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                {toast.title}
              </span>
              <span className="text-[10px] font-bold text-slate-400 shrink-0">
                Just now
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed line-clamp-2">
              {toast.message}
            </p>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleReplaySound(toast.title, toast.message)}
                className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-500 flex items-center gap-1 transition"
                title="Replay Alert Chime"
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Chime</span>
              </button>

              <div className="flex items-center gap-2">
                {toast.actionLabel && onQuickAction && (
                  <button
                    type="button"
                    onClick={() => {
                      onQuickAction(toast.actionLabel!, toast);
                      handleDismiss(toast.toastKey);
                    }}
                    className="text-[11px] font-bold px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm transition"
                  >
                    {toast.actionLabel}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDismiss(toast.toastKey)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
