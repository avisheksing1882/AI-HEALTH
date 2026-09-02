import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  Smartphone, 
  Eye, 
  MessageCircle,
  Loader2,
  Flame,
  Award
} from 'lucide-react';
import { DailyActivityLog, MealLog, UserProfile, WeightLog, WorkoutLog } from '../types';
import { generateWeeklyStatusJPEG, shareWeeklyStatus } from '../services/weeklyShareService';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface WeeklyShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  activities: DailyActivityLog[];
  meals: MealLog[];
  workouts: WorkoutLog[];
  weights: WeightLog[];
}

export const WeeklyShareModal: React.FC<WeeklyShareModalProps> = ({
  isOpen,
  onClose,
  profile,
  activities,
  meals,
  workouts,
  weights
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      handleGenerate();
    } else {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
        setImageUrl(null);
      }
      setImageBlob(null);
      setCopied(false);
      setShareStatus(null);
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setShareStatus(null);
    try {
      soundFx.playTap();
      triggerHaptic();
      const blob = await generateWeeklyStatusJPEG(profile, activities, meals, workouts, weights);
      setImageBlob(blob);
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
      soundFx.playSuccessChime();
    } catch (err) {
      console.error('Failed to generate weekly status JPEG:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!imageBlob) return;
    soundFx.playRingCelebration();
    triggerHaptic();

    const res = await shareWeeklyStatus(imageBlob, `VitalTrack-Weekly-Status-${profile.email.split('@')[0]}.jpeg`);
    if (res.method === 'native') {
      setShareStatus('Shared via native apps!');
    } else {
      setShareStatus('JPEG Photo downloaded directly to your device!');
    }
    setTimeout(() => setShareStatus(null), 5000);
  };

  const handleDownload = () => {
    if (!imageBlob) return;
    soundFx.playTap();
    triggerHaptic();
    const url = URL.createObjectURL(imageBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VitalTrack-Weekly-Health-${new Date().toISOString().split('T')[0]}.jpeg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    setShareStatus('JPEG photo saved to your gallery / downloads!');
    setTimeout(() => setShareStatus(null), 4000);
  };

  const handleCopy = async () => {
    if (!imageBlob) return;
    soundFx.playTap();
    triggerHaptic();
    try {
      // Need PNG for ClipboardItem in some browsers, or write direct blob
      const item = new ClipboardItem({ 'image/png': imageBlob as any });
      await navigator.clipboard.write([item]);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback: copy text caption
      await navigator.clipboard.writeText(
        `🔥 Check out my weekly health & fitness telemetry on VitalTrack AI! Tracked my steps, calories, and clinical nutrition.`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleOpenWhatsAppDirect = () => {
    soundFx.playTap();
    triggerHaptic();
    const text = encodeURIComponent(
      `🔥 My Weekly Health Progress on VitalTrack AI:\n` +
      `• Total Steps: ${activities.reduce((s, a) => s + (a.steps || 0), 0).toLocaleString()} steps\n` +
      `• Active Calories Burned: ${activities.reduce((s, a) => s + (a.activeCaloriesBurned || 0), 0).toLocaleString()} kcal\n` +
      `• Workouts Completed: ${workouts.length} sessions\n` +
      `Check out the full telemetry poster on my WhatsApp Status! 🏆`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-obsidian-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-obsidian-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>WhatsApp Status Weekly Poster</span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                  1080×1920 JPEG
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Futuristic 9:16 high-definition photo ready to share on WhatsApp, Stories & Socials
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

        {/* Status Notification if present */}
        {shareStatus && (
          <div className="px-5 py-2.5 bg-emerald-500/15 border-b border-emerald-500/20 flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <Check className="w-4 h-4" />
            <span>{shareStatus}</span>
          </div>
        )}

        {/* Content Body: Live Preview & Action Buttons */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          <div className="flex flex-col md:flex-row gap-5 items-center">
            
            {/* 9:16 Phone Mockup / Image Preview */}
            <div className="relative w-full max-w-[240px] sm:max-w-[260px] aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-900 dark:border-obsidian-800 bg-obsidian-950 shrink-0 group">
              {isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  <span className="text-xs font-bold text-white">Synthesizing High-DPI Poster...</span>
                  <span className="text-[10px] text-slate-400">Rendering telemetry metrics, cyber gradients & charts</span>
                </div>
              ) : imageUrl ? (
                <>
                  <img
                    src={imageUrl}
                    alt="Weekly Health Status Poster"
                    className="w-full h-full object-cover"
                  />
                  {/* Hover Overlay with Preview Zoom */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a
                      href={imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 shadow-lg"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Full Resolution</span>
                    </a>
                  </div>
                </>
              ) : null}
            </div>

            {/* Right Information & Action Panel */}
            <div className="flex-1 space-y-4 text-left">
              <div>
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
                  Futuristic Visual Telemetry
                </span>
                <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  Ready to Share on WhatsApp Status
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Engineered with exact 1080×1920 proportions to fill smartphone screens edge-to-edge. Includes your 7-day step volume, active calorie burn, hydration telemetry, and clinical compliance scores.
                </p>
              </div>

              {/* Highlights pills */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Format</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">Ultra HD JPEG</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Aspect Ratio</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">9:16 (Status)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                {/* Primary Button: Share Directly */}
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={isGenerating || !imageBlob}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share directly to WhatsApp & Apps</span>
                </button>

                {/* Secondary: Download JPEG Photo */}
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isGenerating || !imageBlob}
                  className="w-full py-3 px-5 rounded-2xl bg-slate-100 dark:bg-obsidian-800 hover:bg-slate-200 dark:hover:bg-obsidian-700 text-slate-900 dark:text-white font-bold text-xs border border-slate-200 dark:border-slate-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-emerald-500" />
                  <span>Download JPEG Photo to Gallery</span>
                </button>

                {/* Tertiary Row: WhatsApp Direct + Copy Image */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleOpenWhatsAppDirect}
                    className="py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20 transition flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Web</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-obsidian-800 hover:bg-slate-200 dark:hover:bg-obsidian-700 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 transition flex items-center justify-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
