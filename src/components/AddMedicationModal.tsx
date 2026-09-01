import React, { useState } from 'react';
import { X, Pill, Bell, Clock, Calendar, ShieldCheck, Sparkles, Check } from 'lucide-react';
import { HealthCondition, Medication, MedicationFrequency, MedicationTiming, UserProfile } from '../types';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface AddMedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (med: Medication) => void;
  profile: UserProfile;
}

const COMMON_PRESETS: {
  name: string;
  dosage: string;
  frequency: MedicationFrequency;
  timing: MedicationTiming;
  reminderTime: string;
  conditionTag?: HealthCondition;
  notes: string;
}[] = [
  { name: 'Thyroxine (Eltroxin/Thyronorm)', dosage: '50 mcg', frequency: 'daily', timing: 'before_breakfast', reminderTime: '06:30', conditionTag: 'thyroid', notes: 'Take on an empty stomach with water 30-45 mins before tea/breakfast' },
  { name: 'Metformin', dosage: '500 mg', frequency: 'twice_daily', timing: 'after_breakfast', reminderTime: '08:30', conditionTag: 'pcos_pcod', notes: 'Take after meals to minimize stomach upset' },
  { name: 'Myo-Inositol & D-Chiro Inositol', dosage: '2000 mg', frequency: 'daily', timing: 'before_breakfast', reminderTime: '07:30', conditionTag: 'pcos_pcod', notes: 'Mix with water before morning meal' },
  { name: 'Vitamin D3 & Calcium', dosage: '60,000 IU', frequency: 'weekly', timing: 'after_breakfast', reminderTime: '09:00', conditionTag: 'knee_pain', notes: 'Take with milk or fatty meal for optimal absorption' },
  { name: 'Omega-3 Fish Oil', dosage: '1000 mg', frequency: 'daily', timing: 'after_dinner', reminderTime: '20:30', conditionTag: 'knee_pain', notes: 'Anti-inflammatory joint & heart support' },
  { name: 'Telmisartan (Blood Pressure)', dosage: '40 mg', frequency: 'daily', timing: 'after_breakfast', reminderTime: '08:00', conditionTag: 'hypertension', notes: 'Take regularly at the same morning hour' },
  { name: 'Pantoprazole / Antacid', dosage: '40 mg', frequency: 'daily', timing: 'before_breakfast', reminderTime: '07:00', conditionTag: 'gerd_acidity', notes: 'Take 30 mins before first meal' },
  { name: 'Daily Multivitamin & Zinc', dosage: '1 tablet', frequency: 'daily', timing: 'after_breakfast', reminderTime: '09:00', conditionTag: 'none', notes: 'Boosts baseline micronutrient and immunity levels' },
];

export const AddMedicationModal: React.FC<AddMedicationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  profile,
}) => {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState<MedicationFrequency>('daily');
  const [timing, setTiming] = useState<MedicationTiming>('after_breakfast');
  const [reminderTime, setReminderTime] = useState('08:00');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [conditionTag, setConditionTag] = useState<HealthCondition | undefined>(undefined);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleApplyPreset = (p: typeof COMMON_PRESETS[0]) => {
    soundFx.playTap();
    triggerHaptic();
    setName(p.name);
    setDosage(p.dosage);
    setFrequency(p.frequency);
    setTiming(p.timing);
    setReminderTime(p.reminderTime);
    setConditionTag(p.conditionTag);
    setNotes(p.notes);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    soundFx.playTap();
    triggerHaptic();

    const newMed: Medication = {
      id: `med-${Date.now()}`,
      userId: profile.id,
      name: name.trim(),
      dosage: dosage.trim() || '1 dose',
      frequency,
      timing,
      reminderTime,
      reminderEnabled,
      conditionTag,
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    };

    onSave(newMed);
    onClose();
  };

  // Filter presets matching user conditions
  const relevantPresets = COMMON_PRESETS.filter(p => 
    !p.conditionTag || p.conditionTag === 'none' || profile.healthConditions?.includes(p.conditionTag)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg bg-white dark:bg-obsidian-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add Medication or Supplement
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track doses, timing & set automatic notification reminders
              </p>
            </div>
          </div>

          <button
            onClick={() => { soundFx.playTap(); onClose(); }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-obsidian-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Quick Condition Presets */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              ⚡ Quick Condition Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {relevantPresets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-obsidian-950 hover:bg-indigo-500/10 hover:border-indigo-500/30 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 transition font-semibold flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>{p.name.split(' ')[0]} ({p.dosage})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name & Dosage */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Medication / Supplement Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Thyroxine, Metformin, Vitamin D3"
                className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Dosage
              </label>
              <input
                type="text"
                value={dosage}
                onChange={e => setDosage(e.target.value)}
                placeholder="e.g. 50mcg, 500mg"
                className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Timing & Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Meal Timing
              </label>
              <select
                value={timing}
                onChange={e => setTiming(e.target.value as MedicationTiming)}
                className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="before_breakfast">🌅 Before Breakfast (Empty Stomach)</option>
                <option value="after_breakfast">🍳 After Breakfast</option>
                <option value="with_lunch">🥗 With Lunch</option>
                <option value="after_dinner">🍲 After Dinner</option>
                <option value="before_bed">🌙 Before Bed</option>
                <option value="specific_time">⏰ Specific Time</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value as MedicationFrequency)}
                className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="daily">Once Daily</option>
                <option value="twice_daily">Twice Daily</option>
                <option value="three_times_daily">3 Times Daily</option>
                <option value="weekly">Once Weekly</option>
                <option value="as_needed">As Needed (SOS)</option>
              </select>
            </div>
          </div>

          {/* Reminder Time & Toggle */}
          <div className="p-3.5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-950/30 border border-indigo-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Notification Reminder
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={e => setReminderEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {reminderEnabled && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-slate-500">Alert at:</span>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={e => setReminderTime(e.target.value)}
                  className="bg-white dark:bg-obsidian-900 border border-indigo-500/30 rounded-xl px-3 py-1.5 font-black text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                  (You'll receive a browser push notification)
                </span>
              </div>
            )}
          </div>

          {/* Clinical Instructions / Notes */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Doctor's Instructions or Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Take with a full glass of water, avoid dairy for 2 hours"
              className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Footer Submit Button */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-obsidian-800 transition font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold shadow-md shadow-indigo-500/20 transition active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Medication</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
