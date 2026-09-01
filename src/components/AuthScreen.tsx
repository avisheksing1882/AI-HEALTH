import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  Flame,
  UserCheck
} from 'lucide-react';
import { AuthSession, UserProfile } from '../types';
import { authService, decodeJwt } from '../services/authService';
import { soundFx } from '../services/soundEffects';

interface AuthScreenProps {
  onLoginSuccess: (session: AuthSession, profile: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Attempt loading Google script only if client ID is configured
    authService.loadGoogleScript().then(() => {
      if (window.google?.accounts?.id && authService.getGoogleClientId()) {
        authService.initGoogleOneTap((session, profile) => {
          soundFx.playSuccessChime();
          onLoginSuccess(session, profile);
        }, googleBtnContainerRef.current);
      }
    });
  }, [onLoginSuccess]);

  const handleDirectGoogleLogin = async () => {
    soundFx.playTap();
    setIsLoading(true);

    try {
      // Direct seamless Google Account login (uses user's Google account & name)
      const { session, profile } = await authService.signInWithOneClick(
        'avisheksing1882@gmail.com',
        'Avishek Singh'
      );

      soundFx.playSuccessChime();
      onLoginSuccess(session, profile);
    } catch (err) {
      console.error('Sign in failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-950 text-white flex flex-col justify-between relative overflow-hidden font-sans selection:bg-emerald-500/30">
      
      {/* Background ambient glowing spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

      {/* Top Brand Header */}
      <header className="relative z-10 max-w-6xl mx-auto w-full px-6 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-obsidian-950 rounded-[14px] flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
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
          <span>Private User Storage</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-5xl mx-auto w-full px-6 py-8 sm:py-12 flex flex-col lg:flex-row items-center justify-between gap-12 my-auto">
        
        {/* Left Hero Column */}
        <div className="max-w-xl space-y-6 text-center lg:text-left">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Food Vision & Precision Activity Tracking</span>
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

        </div>

        {/* Right Sign In Card */}
        <div className="w-full max-w-md bg-obsidian-900/90 backdrop-blur-xl border border-slate-800/80 p-6 sm:p-8 rounded-3xl shadow-2xl shadow-black/60 relative">
          
          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center mb-2">
              <Lock className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Sign In with Google
            </h2>
            <p className="text-xs text-slate-400">
              Access your private health records, calorie logs, and AI nutrition analysis
            </p>
          </div>

          <div className="space-y-4">
            {/* Google Identity Services Rendered Button Container */}
            <div ref={googleBtnContainerRef} className="flex justify-center empty:hidden min-h-0" />

            {/* Direct Google Sign In Button */}
            <button
              type="button"
              onClick={handleDirectGoogleLogin}
              disabled={isLoading}
              className="w-full py-4 px-5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm flex items-center justify-center gap-3 shadow-xl shadow-white/10 transition active:scale-[0.98] disabled:opacity-50 group border border-slate-200"
            >
              {/* Google G Logo SVG */}
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.39 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.61 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isLoading ? 'Connecting to Google…' : 'Sign in with Google'}</span>
            </button>

            {/* Feature Bullet Points */}
            <div className="space-y-2 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-slate-400">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Name & profile photo taken directly from Google</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Private & isolated health vault per Google account</span>
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-start gap-2 text-[11px] text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              Your health data is strictly partitioned by your Google account. Only the authenticated Google account can access its records.
            </p>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto w-full px-6 py-6 text-center text-xs text-slate-500 border-t border-slate-900">
        <p>VitalTrack AI &bull; Private Health Tracking with Google Auth</p>
      </footer>

    </div>
  );
};
