import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  Lock, 
  FileText, 
  Award, 
  HeartPulse, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';
import { soundFx } from '../services/soundEffects';

export type LegalTabType = 'disclaimer' | 'privacy' | 'terms' | 'about';

interface LegalAndTrustModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTabType;
}

export const LegalAndTrustModal: React.FC<LegalAndTrustModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'disclaimer'
}) => {
  const [activeTab, setActiveTab] = useState<LegalTabType>(initialTab);

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          soundFx.playTap();
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-obsidian-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                VitalTrack AI Transparency &amp; Trust
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Medical Disclaimers, Science Standards &amp; Privacy Policies
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playTap();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-obsidian-800 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none bg-white dark:bg-obsidian-900">
          <button
            type="button"
            onClick={() => { soundFx.playTap(); setActiveTab('disclaimer'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'disclaimer'
                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-obsidian-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Medical Disclaimer</span>
          </button>

          <button
            type="button"
            onClick={() => { soundFx.playTap(); setActiveTab('about'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'about'
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-obsidian-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Scientific Standards</span>
          </button>

          <button
            type="button"
            onClick={() => { soundFx.playTap(); setActiveTab('privacy'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'privacy'
                ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-obsidian-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>

          <button
            type="button"
            onClick={() => { soundFx.playTap(); setActiveTab('terms'); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'terms'
                ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-obsidian-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms of Service</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          
          {/* TAB 1: MEDICAL DISCLAIMER (YMYL) */}
          {activeTab === 'disclaimer' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>Important Medical &amp; Health Notice</span>
                </div>
                <p className="text-xs leading-relaxed">
                  VitalTrack AI is an educational fitness, nutrition, and self-monitoring application. 
                  It is <strong>not a certified medical device</strong> and does not provide medical diagnoses, treatment plans, or prescription dietary therapies.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Not a Substitute for Professional Medical Advice</h3>
                <p>
                  The content, AI analysis, calorie approximations, and macronutrient targets provided by VitalTrack AI are for general wellness awareness only. 
                  Never disregard professional medical advice, change prescription dosages, or delay seeking clinical attention because of insights obtained through this platform.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. Nature of AI Nutritional Estimations</h3>
                <p>
                  Our AI Food Lens estimates portion sizes and ingredients via computer vision cross-referenced with public nutritional databases. 
                  Due to natural variations in culinary preparations, cooking oils, recipes, and ingredient densities, all calorie and nutrient numbers are approximations.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">3. Medical Emergencies</h3>
                <p>
                  If you believe you have a medical emergency, acute allergic reaction, cardiac event, or sudden illness, immediately dial your local emergency services (such as 911, 112, or 108) or consult a qualified healthcare professional.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: SCIENTIFIC STANDARDS */}
          {activeTab === 'about' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Validated Clinical Formulations</h3>
                <p>
                  VitalTrack AI relies on peer-reviewed metabolic science and recognized governmental food composition tables to deliver clinically grounded recommendations:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-emerald-500">Mifflin-St Jeor Equation</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Recognized by the Academy of Nutrition and Dietetics as the most accurate clinical formula for estimating Basal Metabolic Rate (BMR) in healthy adults.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-cyan-500">ICMR-NIN IFCT 2017</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Indian Food Composition Tables published by the National Institute of Nutrition (ICMR) for verified South Asian and Indian nutritional values.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-orange-500">USDA FoodData Central</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Standard Reference and Foundation Foods databases from the United States Department of Agriculture for international foods and raw commodities.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-indigo-500">Dynamic Water Hydration</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Weight-based hydration targets (35ml/kg baseline) dynamically compensated for active sweat loss (+350ml per 30 minutes of high-intensity exercise).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Zero Third-Party Advertising &amp; Data Isolation</h3>
                <p>
                  VitalTrack AI respects the sensitive nature of your personal health, weight, and dietary habits:
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200">Google Identity Services:</strong> We use official Google Identity tokens to authenticate your account. We never store or transmit your Google password.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200">Partitioned Cloud Storage:</strong> Health records in Cloud Firestore are strictly segregated under your unique user ID (users/[userId]/...).
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200">User Data Ownership:</strong> You retain complete ownership of your records. You can download an unencrypted JSON export or permanently wipe all records anytime in Profile Settings.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TERMS OF SERVICE */}
          {activeTab === 'terms' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Acceptance of Terms</h3>
                <p>
                  By accessing or using VitalTrack AI, you agree to be bound by these terms. 
                  If you do not agree with any part of these terms, please discontinue using the service.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Permitted Use &amp; Accountability</h3>
                <p>
                  The service is provided for individual, non-commercial self-monitoring. 
                  Users are responsible for ensuring physical exercises and dietary habits are safe for their personal physiological condition.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Limitation of Liability</h3>
                <p>
                  VitalTrack AI and its contributors disclaim any liability for injuries, health complications, or damages resulting directly or indirectly from nutritional approximations, step counting deviations, or workout recommendations provided by the software.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-obsidian-950 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Last Updated: September 2026 • VitalTrack AI
          </span>
          <button
            type="button"
            onClick={() => {
              soundFx.playTap();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-obsidian-800 hover:bg-slate-300 dark:hover:bg-obsidian-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
