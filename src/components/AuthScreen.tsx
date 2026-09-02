import React, { useState } from 'react';
import { 
  Activity, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  Flame,
  UserCheck,
  Zap,
  HeartPulse
} from 'lucide-react';
import { AuthSession, UserProfile } from '../types';
import { authService } from '../services/authService';
import { soundFx } from '../services/soundEffects';
import { LegalAndTrustModal, LegalTabType } from './LegalAndTrustModal';

interface AuthScreenProps {
  onLoginSuccess: (session: AuthSession, profile: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const googleBtnContainerRef = React.useRef<HTMLDivElement>(null);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalInitialTab, setLegalInitialTab] = useState<LegalTabType>('disclaimer');

  const openLegalModal = (tab: LegalTabType) => {
    soundFx.playTap();
    setLegalInitialTab(tab);
    setLegalModalOpen(true);
  };

  React.useEffect(() => {
    // Initialize official Google Identity Services SDK
    authService.initGoogleIdentityServices((session, profile) => {
      soundFx.playSuccessChime();
      onLoginSuccess(session, profile);
    }, googleBtnContainerRef.current);
  }, [onLoginSuccess]);

  return (
    <div className="min-h-screen bg-obsidian-950 text-white flex flex-col justify-between relative overflow-hidden font-sans selection:bg-emerald-500/30">
      
      {/* Background ambient glowing spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

      {/* Top Brand Header */}
      <header className="relative z-10 max-w-6xl mx-auto w-full px-6 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/assets/vital-track-logo.svg" 
            alt="VitalTrack AI - Smart Health &amp; Fitness Logo" 
            className="w-10 h-10 rounded-2xl shadow-lg shadow-orange-500/20 object-contain shrink-0" 
            width={40}
            height={40}
          />
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              VitalTrack AI
            </span>
            <span className="text-[10px] ml-2 font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              HEALTH
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-obsidian-900/60 border border-slate-800 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Private Google Storage</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-5xl mx-auto w-full px-6 py-8 sm:py-12 flex flex-col lg:flex-row items-center justify-between gap-12 my-auto">
        
        {/* Left Hero Column */}
        <section className="max-w-xl space-y-6 text-center lg:text-left">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Food Vision &amp; Precision Activity Tracking</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            Your personal <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              health ecosystem.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
            Monitor daily steps, log multi-item food photos with calorie estimations, and review personal health trends privately linked to your Google account.
          </p>

          {/* Feature Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-obsidian-900/70 border border-slate-800/80 p-3 rounded-2xl flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                <Flame className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-200">AI Food Lens</p>
                <p className="text-[10px] text-slate-400">Photo to macros</p>
              </div>
            </div>

            <div className="bg-obsidian-900/70 border border-slate-800/80 p-3 rounded-2xl flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Activity className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-200">Step Pedometer</p>
                <p className="text-[10px] text-slate-400">Live movement</p>
              </div>
            </div>

            <div className="bg-obsidian-900/70 border border-slate-800/80 p-3 rounded-2xl flex items-center gap-2.5 col-span-2 sm:col-span-1">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-200">Isolated Data</p>
                <p className="text-[10px] text-slate-400">Per Google account</p>
              </div>
            </div>
          </div>

          {/* YMYL Clinical Trust Banner */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-obsidian-900/40 border border-slate-800/60 px-3.5 py-2.5 rounded-2xl text-left">
            <HeartPulse className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="leading-snug">
              <span>Formulated using Mifflin-St Jeor &amp; ICMR-NIN / USDA nutritional data. </span>
              <button
                type="button"
                onClick={() => openLegalModal('disclaimer')}
                className="text-emerald-400 hover:underline font-semibold"
              >
                Medical Disclaimer &rarr;
              </button>
            </div>
          </div>

        </section>

        {/* Right Sign In Card */}
        <section className="w-full max-w-md bg-obsidian-900/90 backdrop-blur-xl border border-slate-800/80 p-6 sm:p-8 rounded-3xl shadow-2xl shadow-black/60 relative">
          
          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center mb-2">
              <Lock className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              1-Tap Google Sign-In
            </h2>
            <p className="text-xs text-slate-400">
              Access your private health records, calorie logs, and AI nutrition dashboard
            </p>
          </div>

          {/* Real Google Identity Services Sign In Button */}
          <div className="space-y-4">
            {/* Google Identity Services Rendered Button Container */}
            <div ref={googleBtnContainerRef} className="flex justify-center my-2 min-h-[44px]" />

            {/* Feature Bullet Points */}
            <div className="space-y-2 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-slate-400">
                <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Verified Google Identity Authentication</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <UserCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Automatic profile &amp; photo sync from Google</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Private &amp; isolated local health database</span>
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-start gap-2 text-[11px] text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              Your health data is strictly partitioned for your account. Only your authenticated session can access its records.
            </p>
          </div>

        </section>

      </main>

      {/* Footer with YMYL Trust Links */}
      <footer className="relative z-10 max-w-6xl mx-auto w-full px-6 py-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>VitalTrack AI • Private Health Tracking with 1-Tap Google Auth</p>

        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
          <button
            type="button"
            onClick={() => openLegalModal('disclaimer')}
            className="hover:text-rose-400 transition underline underline-offset-4"
          >
            Medical Disclaimer
          </button>
          <button
            type="button"
            onClick={() => openLegalModal('about')}
            className="hover:text-emerald-400 transition underline underline-offset-4"
          >
            Scientific Standards
          </button>
          <button
            type="button"
            onClick={() => openLegalModal('privacy')}
            className="hover:text-cyan-400 transition underline underline-offset-4"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => openLegalModal('terms')}
            className="hover:text-indigo-400 transition underline underline-offset-4"
          >
            Terms of Service
          </button>
        </div>
      </footer>

      {/* Interactive Legal, Medical & Trust Modal */}
      <LegalAndTrustModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalInitialTab}
      />

    </div>
  );
};
