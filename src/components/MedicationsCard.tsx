import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  Plus, 
  Bell, 
  BellOff, 
  Check, 
  Clock, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { Medication, MedicationLog, UserProfile } from '../types';
import { 
  getMedications, 
  saveMedication, 
  deleteMedication, 
  logMedicationStatus, 
  getMedicationLogsForDate,
  getTodayDateString
} from '../services/db';
import { soundFx, triggerHaptic } from '../services/soundEffects';
import { AddMedicationModal } from './AddMedicationModal';

interface MedicationsCardProps {
  profile: UserProfile;
  selectedDate: string;
}

export const MedicationsCard: React.FC<MedicationsCardProps> = ({
  profile,
  selectedDate,
}) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todayLogs, setTodayLogs] = useState<MedicationLog[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load medications & today's logs
  const loadData = async () => {
    try {
      const meds = await getMedications(profile.id);
      const logs = await getMedicationLogsForDate(profile.id, selectedDate);
      setMedications(meds);
      setTodayLogs(logs);
    } catch (e) {
      console.warn('Failed to load medications:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile.id, selectedDate]);

  const handleToggleTaken = async (med: Medication) => {
    soundFx.playSuccessChime();
    triggerHaptic();

    const existingLog = todayLogs.find(l => l.medicationId === med.id);
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (existingLog && existingLog.status === 'taken') {
      // Toggle back to not taken (delete log)
      const updatedLog: MedicationLog = {
        ...existingLog,
        status: 'skipped',
        timestamp: new Date().toISOString()
      };
      await logMedicationStatus(updatedLog);
      setTodayLogs(prev => prev.map(l => l.medicationId === med.id ? updatedLog : l));
    } else {
      // Log as taken
      const newLog: MedicationLog = {
        id: `medlog-${med.id}-${selectedDate}`,
        userId: profile.id,
        medicationId: med.id,
        medicationName: med.name,
        date: selectedDate,
        timeTaken: currentTimeStr,
        status: 'taken',
        timestamp: new Date().toISOString()
      };
      await logMedicationStatus(newLog);
      setTodayLogs(prev => {
        const filtered = prev.filter(l => l.medicationId !== med.id);
        return [...filtered, newLog];
      });
    }
  };

  const handleSaveMed = async (newMed: Medication) => {
    await saveMedication(newMed);
    await loadData();
  };

  const handleDeleteMed = async (medId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundFx.playTap();
    if (window.confirm('Remove this medication from your schedule?')) {
      await deleteMedication(profile.id, medId);
      await loadData();
    }
  };

  // Format timing label
  const formatTiming = (t: string) => {
    switch (t) {
      case 'before_breakfast': return '🌅 Before Breakfast';
      case 'after_breakfast': return '🍳 After Breakfast';
      case 'with_lunch': return '🥗 With Lunch';
      case 'after_dinner': return '🍲 After Dinner';
      case 'before_bed': return '🌙 Before Bed';
      default: return '⏰ Scheduled';
    }
  };

  const takenCount = medications.filter(m => {
    const log = todayLogs.find(l => l.medicationId === m.id);
    return log && log.status === 'taken';
  }).length;

  const totalCount = medications.length;
  const adherencePct = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white dark:bg-obsidian-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Daily Medications & Supplements
              </h3>
              {totalCount > 0 && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  adherencePct === 100
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20'
                    : 'bg-indigo-500/15 text-indigo-500 border border-indigo-500/20'
                }`}>
                  {takenCount}/{totalCount} Taken ({adherencePct}%)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track your prescriptions, thyroid pills & vitamins with reminders
            </p>
          </div>
        </div>

        {/* Add Medication Button */}
        <button
          onClick={() => { soundFx.playTap(); setIsAddModalOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition active:scale-95 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Med</span>
        </button>
      </div>

      {/* Empty State */}
      {medications.length === 0 && !isLoading && (
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-obsidian-950/60 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              No Medications or Supplements Added Yet
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-0.5">
              Add your daily prescriptions, thyroid pills, PCOS supplements, or vitamins to get timely reminders.
            </p>
          </div>
          <button
            onClick={() => { soundFx.playTap(); setIsAddModalOpen(true); }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm"
          >
            + Add First Medication
          </button>
        </div>
      )}

      {/* Medication Cards List */}
      {medications.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {medications.map(med => {
            const log = todayLogs.find(l => l.medicationId === med.id);
            const isTaken = log && log.status === 'taken';

            return (
              <div
                key={med.id}
                className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                  isTaken
                    ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-white dark:bg-obsidian-950/80 border-slate-200 dark:border-slate-800/80 hover:border-indigo-500/30'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => handleToggleTaken(med)}
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center transition shrink-0 active:scale-90 ${
                      isTaken
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/30'
                        : 'bg-slate-100 dark:bg-obsidian-900 text-slate-400 border border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-500'
                    }`}
                    title={isTaken ? 'Tap to mark un-taken' : 'Tap to mark taken'}
                  >
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className={`text-xs font-bold truncate ${isTaken ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                        {med.name}
                      </h4>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        {med.dosage}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 flex-wrap">
                      <span>{formatTiming(med.timing)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {med.reminderTime}
                      </span>
                      {med.reminderEnabled && (
                        <span className="text-indigo-500 flex items-center gap-0.5" title="Reminder Active">
                          <Bell className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    {isTaken && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                        ✓ Taken at {log?.timeTaken}
                      </span>
                    )}

                    {med.notes && !isTaken && (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[200px]">
                        {med.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => handleDeleteMed(med.id, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                    title="Delete medication"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Medication Modal */}
      <AddMedicationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveMed}
        profile={profile}
      />

    </div>
  );
};
