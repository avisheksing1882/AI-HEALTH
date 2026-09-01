import React from 'react';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Flame, Droplet, Award, Footprints } from 'lucide-react';
import { NutritionInsight } from '../types';

interface NutritionInsightsCardProps {
  insights: NutritionInsight[];
}

export const NutritionInsightsCard: React.FC<NutritionInsightsCardProps> = ({ insights }) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame': return <Flame className="w-4 h-4 text-orange-500" />;
      case 'Zap': return <Sparkles className="w-4 h-4 text-indigo-500" />;
      case 'Droplet': return <Droplet className="w-4 h-4 text-blue-500" />;
      case 'Award': return <Award className="w-4 h-4 text-emerald-500" />;
      case 'Footprints': return <Footprints className="w-4 h-4 text-cyan-500" />;
      case 'AlertCircle':
      case 'AlertTriangle': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getBorderAndBg = (type: NutritionInsight['type']) => {
    switch (type) {
      case 'positive':
        return 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/20 text-emerald-900 dark:text-emerald-200';
      case 'warning':
        return 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/20 text-amber-900 dark:text-amber-200';
      case 'tip':
        return 'bg-purple-500/5 dark:bg-purple-950/20 border-purple-500/20 text-purple-900 dark:text-purple-200';
      default:
        return 'bg-cyan-500/5 dark:bg-cyan-950/20 border-cyan-500/20 text-cyan-900 dark:text-cyan-200';
    }
  };

  if (!insights || insights.length === 0) return null;

  return (
    <div className="bg-white dark:bg-obsidian-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            AI Nutrition & Metabolic Insights
          </h3>
        </div>
        <span className="text-[10px] uppercase font-bold text-slate-400">Live Feedback</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={`p-3 rounded-2xl border flex items-start gap-3 transition ${getBorderAndBg(insight.type)}`}
          >
            <div className="p-1.5 rounded-xl bg-white dark:bg-obsidian-900 shrink-0 shadow-sm">
              {getIcon(insight.iconName)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {insight.title}
                </h4>
                {insight.metric && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-white/60 dark:bg-obsidian-900/60">
                    {insight.metric}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                {insight.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
