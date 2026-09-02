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
  Send,
  Volume2,
  Plus,
  Pill,
  Play,
  CheckCircle2,
  AlertCircle
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
  const [activeTab, setActiveTab] = useState<'feed' | 'rules'>('rules');
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  // New custom reminder state
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('18:00');
  const [newType, setNewType] = useState<NotificationRule['type']>('custom_reminder');
  const [newSoundTone, setNewSoundTone] = useState<'bell' | 'water' | 'meal' | 'medication' | 'workout'>('bell');
  const [activeSoundPlaying, setActiveSoundPlaying] = useState<string | null>(null);

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
    await notificationService.toggleRule(ruleId, !currentVal);
    setRules(rules.map(r => r.id === ruleId ? { ...r, enabled: !currentVal } : r));
  };

  const handleDeleteRule = async (ruleId: string) => {
    soundFx.playTap();
    await notificationService.deleteRule(ruleId);
    setRules(rules.filter(r => r.id !== ruleId));
  };

  const handleSnooze = async (ruleId: string, mins: number) => {
    soundFx.playTap();
    triggerHaptic();
    await notificationService.snoozeRule(ruleId, mins);
    await loadData();
  };

  const handlePlaySound = (soundType: 'bell' | 'water' | 'meal' | 'medication' | 'workout') => {
    setActiveSoundPlaying(soundType);
    triggerHaptic();
    switch (soundType) {
      case 'water': soundFx.playWaterReminderSound(); break;
      case 'meal': soundFx.playMealReminderSound(); break;
      case 'medication': soundFx.playMedicationAlert(); break;
      case 'workout': soundFx.playWorkoutAlert(); break;
      default: soundFx.playReminderAlert(); break;
    }
    setTimeout(() => setActiveSoundPlaying(null), 1200);
  };

  const handleTriggerLiveTest = async () => {
    soundFx.playReminderAlert();
    triggerHaptic();
    await notificationService.triggerNotification(
      'Live Reminder Alert 🔔',
      'Audible reminder sound verified! Your reminders will alert you flawlessly with audio and on-screen cards.',
      'reminder',
      'Got It!'
    );
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    soundFx.playRingCelebration();
    triggerHaptic();

    const created = await notificationService.addCustomRule(
      newTitle.trim(),
      newTime,
      newType,
      `Daily alert at ${newTime}`,
      newSoundTone
    );

    if (created) {
      setRules(prev => [...prev, created]);
    }

    setNewTitle('');
    setIsAddingReminder(false);
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

  const getRuleIcon = (type: NotificationRule['type']) => {
    switch (type) {
      case 'water_reminder': return <Droplet className="w-4 h-4 text-cyan-500" />;
      case 'meal_reminder': return <Utensils className="w-4 h-4 text-amber-500" />;
      case 'medication_reminder': return <Pill className="w-4 h-4 text-rose-500" />;
      case 'workout_reminder': return <Dumbbell className="w-4 h-4 text-emerald-500" />;
      case 'weekly_summary': return <Sparkles className="w-4 h-4 text-purple-500" />;
      default: return <Bell className="w-4 h-4 text-emerald-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-obsidian-900 w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[88vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-obsidian-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Smart Reminders & Sound Center</span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                  Audio Active
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Audible chimes & scheduled alerts for hydration, nutrition & workouts
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

        {/* Browser Permission Prompt if needed */}
        {browserPermission !== 'granted' && (
          <div className="px-5 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Enable desktop web alerts to receive sound & notifications when tab is minimized
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
            onClick={() => { soundFx.playTap(); setActiveTab('rules'); }}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'rules'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Active Reminders & Alarms
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-obsidian-800 text-slate-600 dark:text-slate-400 font-bold">
              {rules.length}
            </span>
          </button>

          <button
            onClick={() => { soundFx.playTap(); setActiveTab('feed'); }}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'feed'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Alert History
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* TAB 1: Rules & Custom Reminders */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              
              {/* Audio Chime Studio & Sound Tester Bar */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Audible Reminder Chimes Studio
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleTriggerLiveTest}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Test Full Alert</span>
                  </button>
                </div>
                
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Click any chime below to test the crystal-clear acoustic synthesizer sound:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-center">
                  {[
                    { id: 'bell', label: '🔔 Bell Chime' },
                    { id: 'water', label: '💧 Water Drop' },
                    { id: 'meal', label: '🍽️ Meal Fuel' },
                    { id: 'medication', label: '💊 Med Pulse' },
                    { id: 'workout', label: '🏃 Workout' },
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handlePlaySound(s.id as any)}
                      className={`px-2 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                        activeSoundPlaying === s.id
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-md scale-95'
                          : 'bg-white dark:bg-obsidian-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500/50'
                      }`}
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Add New Custom Reminder Toggle Button */}
              {!isAddingReminder ? (
                <button
                  type="button"
                  onClick={() => { soundFx.playTap(); setIsAddingReminder(true); }}
                  className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500/60 text-slate-600 dark:text-slate-300 hover:text-emerald-500 text-xs font-bold flex items-center justify-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Set New Custom Daily Reminder with Sound</span>
                </button>
              ) : (
                /* Add Reminder Form */
                <form onSubmit={handleCreateReminder} className="p-4 rounded-2xl bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Create Scheduled Reminder</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingReminder(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Reminder Title:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Drink 500ml Water, Evening Walk..."
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Time of Day:
                      </label>
                      <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Type / Category:
                      </label>
                      <select
                        value={newType}
                        onChange={(e) => {
                          const t = e.target.value as any;
                          setNewType(t);
                          if (t === 'water_reminder') setNewSoundTone('water');
                          else if (t === 'meal_reminder') setNewSoundTone('meal');
                          else if (t === 'workout_reminder') setNewSoundTone('workout');
                          else if (t === 'medication_reminder') setNewSoundTone('medication');
                          else setNewSoundTone('bell');
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="custom_reminder">Custom Alarm</option>
                        <option value="water_reminder">Hydration / Water</option>
                        <option value="workout_reminder">Workout / Exercise</option>
                        <option value="meal_reminder">Meal / Nutrition</option>
                        <option value="medication_reminder">Medication / Pill</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          Chime Sound Effect:
                        </label>
                        <button
                          type="button"
                          onClick={() => handlePlaySound(newSoundTone)}
                          className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold hover:underline flex items-center gap-1"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Preview</span>
                        </button>
                      </div>
                      <select
                        value={newSoundTone}
                        onChange={(e) => {
                          const s = e.target.value as any;
                          setNewSoundTone(s);
                          handlePlaySound(s);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="bell">🔔 Classic Bell</option>
                        <option value="water">💧 Water Drop</option>
                        <option value="meal">🍽️ Meal Arpeggio</option>
                        <option value="medication">💊 Medication Pulse</option>
                        <option value="workout">🏃 Workout Fanfare</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save & Activate Reminder</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Active Reminders List */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Configured Daily Schedules ({rules.length})
                </span>

                {rules.map(rule => (
                  <div
                    key={rule.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-obsidian-900 shadow-xs shrink-0">
                        {getRuleIcon(rule.type)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{rule.title}</h4>
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-obsidian-800 text-[10px] font-mono text-slate-700 dark:text-slate-300 font-bold">
                            {rule.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {rule.description}
                        </p>
                      </div>
                    </div>

                    {/* Right Controls: Play Sound, Snooze, Toggle, Delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const tone = rule.soundTone || (rule.type === 'water_reminder' ? 'water' : rule.type === 'meal_reminder' ? 'meal' : rule.type === 'workout_reminder' ? 'workout' : 'bell');
                          handlePlaySound(tone as any);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-200 dark:hover:bg-obsidian-800 transition"
                        title="Test Reminder Sound"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>

                      {rule.id.startsWith('rule-') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-obsidian-800 transition"
                          title="Delete Custom Reminder"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleRule(rule.id, rule.enabled)}
                        className={`w-10 h-6 flex items-center rounded-full p-1 transition ${
                          rule.enabled ? 'bg-emerald-500 justify-end' : 'bg-slate-300 dark:bg-obsidian-800 justify-start'
                        }`}
                        title={rule.enabled ? 'Enabled' : 'Disabled'}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 2: Notifications History Feed */}
          {activeTab === 'feed' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alerts History</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTriggerLiveTest}
                    className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    Test Sound Alert
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
                  <p className="text-sm font-semibold">No alerts logged</p>
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

        </div>

      </div>
    </div>
  );
};
