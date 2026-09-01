import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, ChevronDown, ChevronUp, ShieldAlert, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { FoodHealthWarning, HealthSeverity } from '../services/healthConditionFoodEvaluator';
import { soundFx } from '../services/soundEffects';

interface FoodHealthWarningAccordionProps {
  warnings: FoodHealthWarning[];
  highestSeverity: HealthSeverity;
  compact?: boolean;
}

export const FoodHealthWarningAccordion: React.FC<FoodHealthWarningAccordionProps> = ({
  warnings,
  highestSeverity,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!warnings || warnings.length === 0) return null;

  const getSeverityStyle = (sev: HealthSeverity) => {
    switch (sev) {
      case 'severe_red':
        return {
          pillBg: 'bg-rose-500/15 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-500/30',
          badgeBg: 'bg-rose-500 text-white',
          border: 'border-rose-500/40',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />,
          cardBg: 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/20'
        };
      case 'warning_orange':
        return {
          pillBg: 'bg-amber-500/15 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-500/30',
          badgeBg: 'bg-amber-500 text-white',
          border: 'border-amber-500/40',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
          cardBg: 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/20'
        };
      case 'caution_yellow':
      default:
        return {
          pillBg: 'bg-yellow-500/15 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
          badgeBg: 'bg-yellow-500 text-slate-900',
          border: 'border-yellow-500/40',
          icon: <AlertCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />,
          cardBg: 'bg-yellow-500/5 dark:bg-yellow-950/20 border-yellow-500/20'
        };
    }
  };

  const topStyle = getSeverityStyle(highestSeverity);

  return (
    <div className="w-full mt-2">
      {/* Accordion Toggle Header */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          soundFx.playTap();
          setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-bold transition-all ${topStyle.pillBg} ${topStyle.border} active:scale-[0.99]`}
      >
        <div className="flex items-center gap-2 text-left min-w-0">
          {topStyle.icon}
          <span className="truncate">
            {highestSeverity === 'severe_red' && '🔴 Health Alert: Not Recommended'}
            {highestSeverity === 'warning_orange' && '🟠 Health Advisory: Consume with Caution'}
            {highestSeverity === 'caution_yellow' && '🟡 Nutritional Advisory: Timing & Portion'}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/50 dark:bg-black/40 shrink-0">
            {warnings.length} condition{warnings.length > 1 ? 's' : ''} flagged
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          <span className="text-[10px] underline font-bold opacity-80">
            {isOpen ? 'Hide Reason' : 'View Clinical Reason'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Expandable Drawer */}
      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="mt-2 space-y-2.5 animate-fade-in"
        >
          {warnings.map((w, idx) => {
            const itemStyle = getSeverityStyle(w.severity);
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border text-xs space-y-2.5 ${itemStyle.cardBg} ${itemStyle.border}`}
              >
                {/* Condition Banner */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white">
                    <span className="text-base">{w.conditionEmoji}</span>
                    <span>{w.conditionName}</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${itemStyle.badgeBg}`}>
                    {w.severityLabel}
                  </span>
                </div>

                {/* Primary Issue & Why */}
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                    {w.title}
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    <strong>Why:</strong> {w.reason}
                  </p>
                </div>

                {/* Clinical Mechanism */}
                <div className="p-2 rounded-xl bg-white/60 dark:bg-black/40 border border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                    Clinical Impact:
                  </span>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    {w.clinicalExplanation}
                  </p>
                </div>

                {/* Actionable Solution & Healthy Swap */}
                <div className="flex items-start gap-2 p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Suggested Clinical Swap / Fix: </strong>
                    <span>{w.recommendedSwap}</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
