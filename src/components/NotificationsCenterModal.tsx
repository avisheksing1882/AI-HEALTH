import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bell, 
  Check, 
  Trash2, 
  Clock, 
  Sparkles, 
  Flame, 
  Utensils, 
  Droplet, 
  Dumbbell, 
  Send
} from 'lucide-react';
import { InAppNotification, NotificationRule, UserProfile } from '../types';
import { db } from '../services/db';
import { notificationService } from '../services/notificationService';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface NotificationsCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
}

export const NotificationsCenterModal: React.FC<NotificationsCenterModalProps> = ({
  isOpen,
  onClose,
  profile
}) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'rules'>('feed');
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (isOpen) {
      loadData();
      setBrowserPermission(notificationService.getBrowserPermission());
      const unsub = notificationService.subscribe(list => setNotifications(list));
      return () => unsub();
    }
  }, [isOpen, profile.id]);

  const loadData = async () => {
    const r = await db.notificationRules.where('userId').equals(profile.id).toArray();
    const n = await db.inAppNotifications.where('userId').equals(profile.id).reverse().sortBy('timestamp');
    setRules(r);
    setNotifications(n);
  };

  const handleRequestPermission = async () => {
    soundFx.playTap();
    const perm = await notificationService.requestBrowserPermission();
    setBrowserPermission(perm);
  };

  const handleToggleRule = async (ruleId: string, currentVal: boolean) => {
    soundFx.playTap();
    await db.notificationRules.update(ruleId, { enabled: !currentVal });
    setRules(rules.map(r => r.id === ruleId ? { ...r, enabled: !currentVal } : r));
  };

  const handleSnooze = async (ruleId: string, mins: number) => {
    soundFx.playTap();
    triggerHaptic();
    await notificationService.snoozeRule(ruleId, mins);
    await loadData();
  };

  const handleTriggerTest = async () => {
    soundFx.playTap();
    triggerHaptic();
    await notificationService.triggerNotification(
      'Evening Goal Alert 🔥',
      'You are close to reaching your daily step goal. Keep up the momentum!',
      'reminder'
    );
  };

  const handleClearAll = async () => {
    soundFx.playTap();
    await notificationService.clearAll();
    setNotifications([]);
  };

  const getNotifIcon = (type: InAppNotification['type']) => {
    switch (type) {
      case 'reminder': return <Clock className="w-4 h-4 text-orange-500" />;
      case 'achievement': return <Flame className="w-4 h-4 text-rose-500" />;
      case 'success': return <Check className="w-4 h-4 text-emerald-500" />;
      default: return <Sparkles className="w-4 h-4 text-cyan-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-obsidian-900 w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[88vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-obsidian-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-500 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Notifications & Smart Reminders
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalized alerts for {profile.email}
              </p>
            </div>
          </div>

          <button
            onClick={() => { soundFx.playTap(); onClose(); }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-obsidian-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Permission Banner */}
        {browserPermission !== 'granted' && (
          <div className="px-5 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Enable desktop web alerts for real-time meal & step reminders
            </span>
            <button
              onClick={handleRequestPermission}
              className="text-xs font-bold px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shrink-0 ml-2"
            >
              Enable
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-3 gap-6 bg-slate-50/50 dark:bg-obsidian-950/50">
          <button
            onClick={() => { soundFx.playTap(); setActiveTab('feed'); }}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'feed'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Inbox Feed
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>

          <button
            onClick={() => { soundFx.playTap(); setActiveTab('rules'); }}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'rules'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Smart Schedules & Alarms
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-obsidian-800 text-slate-600 dark:text-slate-400 font-bold">
              {rules.length}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* TAB 1: Feed */}
          {activeTab === 'feed' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Alerts</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTriggerTest}
                    className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    Test Alert
                  </button>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="text-xs text-rose-500 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Bell className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-sm font-semibold">No alerts right now</p>
                  <p className="text-xs text-slate-500">Your smart nudges and goal celebrations will appear here</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-2xl border transition ${
                      n.read
                        ? 'bg-slate-50/50 dark:bg-obsidian-950/40 border-slate-200/50 dark:border-slate-800/50 opacity-75'
                        : 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-white dark:bg-obsidian-800 shadow-sm shrink-0 mt-0.5">
                        {getNotifIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{n.title}</h4>
                          <span className="text-[10px] text-slate-400 ml-2">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: Rules */}
          {activeTab === 'rules' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block pb-1">
                Automated Behavioral Rules
              </span>

              {rules.map(rule => (
                <div
                  key={rule.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-obsidian-900 shadow-sm text-slate-600 dark:text-slate-300 mt-0.5 shrink-0">
                      {rule.type === 'workout_reminder' && <Dumbbell className="w-4 h-4 text-cyan-500" />}
                      {rule.type === 'meal_reminder' && <Utensils className="w-4 h-4 text-orange-500" />}
                      {rule.type === 'water_reminder' && <Droplet className="w-4 h-4 text-blue-500" />}
                      {rule.type === 'weekly_summary' && <Sparkles className="w-4 h-4 text-purple-500" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{rule.title}</h4>
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-obsidian-800 text-[10px] font-mono text-slate-600 dark:text-slate-300 font-semibold">
                          {rule.time}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{rule.description}</p>
                      {rule.snoozedUntil && new Date(rule.snoozedUntil) > new Date() && (
                        <span className="text-[10px] text-amber-500 font-semibold block mt-1">
                          Snoozed until {new Date(rule.snoozedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleSnooze(rule.id, 60)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-obsidian-800 rounded-lg transition"
                      title="Snooze for 1 hour"
                    >
                      Snooze
                    </button>

                    <button
                      onClick={() => handleToggleRule(rule.id, rule.enabled)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 transition ${
                        rule.enabled ? 'bg-emerald-500 justify-end' : 'bg-slate-300 dark:bg-obsidian-800 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
