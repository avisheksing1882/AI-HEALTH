import React, { useState, useEffect } from 'react';
import { Flame, Utensils, Droplet, Footprints, Sparkles, Pill, LayoutGrid } from 'lucide-react';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface SectionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const DASHBOARD_SECTIONS: SectionItem[] = [
  { id: 'section-overview', label: 'Calories', icon: <Flame className="w-3.5 h-3.5" /> },
  { id: 'section-meds', label: 'Meds', icon: <Pill className="w-3.5 h-3.5" /> },
  { id: 'section-meals', label: 'Food Log', icon: <Utensils className="w-3.5 h-3.5" /> },
  { id: 'section-water', label: 'Hydration', icon: <Droplet className="w-3.5 h-3.5" /> },
  { id: 'section-steps', label: 'Steps', icon: <Footprints className="w-3.5 h-3.5" /> },
  { id: 'section-insights', label: 'Insights', icon: <Sparkles className="w-3.5 h-3.5" /> },
];

export const DashboardSectionNav: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('section-overview');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 140; // Offset for sticky headers
      for (const section of DASHBOARD_SECTIONS) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    soundFx.playTap();
    triggerHaptic();
    setActiveSection(id);

    const el = document.getElementById(id);
    if (el) {
      const navOffset = 115; // Offset for top sticky navbar + section bar
      const elementPosition = el.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = Math.max(0, elementPosition - navOffset);

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="md:hidden sticky top-[95px] sm:top-[105px] z-20 -mx-3 px-3 py-1.5 backdrop-blur-xl bg-white/90 dark:bg-obsidian-950/90 border-y border-slate-200/80 dark:border-slate-800/80 transition-all shadow-sm">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        {DASHBOARD_SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-slate-100/90 dark:bg-obsidian-900/90 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/50 dark:border-slate-800/50'
              }`}
            >
              {section.icon}
              <span>{section.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
