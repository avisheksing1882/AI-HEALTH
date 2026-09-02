import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  Sparkles, 
  Check, 
  Trash2, 
  Plus, 
  Info, 
  Sliders, 
  AlertCircle, 
  RotateCw,
  Layers,
  Search,
  Key,
  ShieldCheck,
  CheckCircle2,
  Image as ImageIcon,
  PenLine,
  UploadCloud,
  FileText
} from 'lucide-react';
import { FoodItemNutrition, MealLog, MealType, UserProfile } from '../types';
import { 
  analyzeFoodImageWithAI, 
  getStoredGeminiApiKey, 
  saveStoredGeminiApiKey, 
  saveUserFoodCorrection, 
  VisionAnalysisResult 
} from '../services/geminiVision';
import { PRESET_SAMPLE_MEALS, FOOD_DATABASE, convertEntryToNutritionItem, lookupFoodByQuery } from '../services/foodCatalog';
import { soundFx, triggerHaptic } from '../services/soundEffects';
import { evaluateFoodForHealthConditions } from '../services/healthConditionFoodEvaluator';
import { FoodHealthWarningAccordion } from './FoodHealthWarningAccordion';

interface AIFoodScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMealSaved: (meal: MealLog) => void;
  profile: UserProfile;
  selectedDate: string;
  initialMealType?: MealType;
  onOpenManualLogger?: () => void;
}

export const AIFoodScannerModal: React.FC<AIFoodScannerModalProps> = ({
  isOpen,
  onClose,
  onMealSaved,
  profile,
  selectedDate,
  initialMealType,
  onOpenManualLogger,
}) => {
  const [mode, setMode] = useState<'camera' | 'upload' | 'presets'>('camera');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepMessage, setScanStepMessage] = useState('Initializing AI Vision...');
  const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResult | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>(initialMealType || 'breakfast');
  const [userLockedMealType, setUserLockedMealType] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Gemini API Key config state
  const [apiKeyInput, setApiKeyInput] = useState(getStoredGeminiApiKey());
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(!getStoredGeminiApiKey());

  // Search & add items
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Camera stream refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize meal type based on target meal or time of day
  useEffect(() => {
    if (isOpen) {
      if (initialMealType) {
        setSelectedMealType(initialMealType);
        setUserLockedMealType(true);
      } else {
        setUserLockedMealType(false);
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        const timeDecimal = currentHour + currentMinutes / 60;
        if (timeDecimal >= 4 && timeDecimal < 11.5) setSelectedMealType('breakfast');
        else if (timeDecimal >= 11.5 && timeDecimal < 16) setSelectedMealType('lunch');
        else if (timeDecimal >= 16 && timeDecimal < 19) setSelectedMealType('snack');
        else setSelectedMealType('dinner');
      }

      // Auto start camera if supported
      startCamera(false);
    } else {
      stopCamera();
      setSelectedImage(null);
      setAnalysisResult(null);
      setIsScanning(false);
      setErrorMessage(null);
      setUserLockedMealType(false);
    }
  }, [isOpen]);

  // Attach video stream whenever videoRef and streamRef are ready
  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => console.warn('Video stream play warning:', err));
    }
  }, [isCameraActive]);

  const startCamera = async (front: boolean = false) => {
    try {
      setErrorMessage(null);
      setAnalysisResult(null);
      setPresetId(null);
      setMode('camera');

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      let stream: MediaStream;
      const desiredFacing = front ? 'user' : 'environment';

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: desiredFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      setErrorMessage(
        isDenied
          ? 'Camera access denied. Please allow camera permissions in your browser bar.'
          : 'Could not connect to camera hardware. You can upload a photo or select a sample dish.'
      );
      setMode('presets');
      setIsCameraActive(false);
    }
  };

  const toggleCameraFacing = async () => {
    soundFx.playTap();
    const nextFacing = !isFrontCamera;
    setIsFrontCamera(nextFacing);
    await startCamera(nextFacing);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhotoFromCamera = () => {
    if (!videoRef.current) return;
    soundFx.playCameraSnap();
    triggerHaptic();

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setSelectedImage(dataUrl);
      setPresetId(null);
      stopCamera();
      triggerAiScan(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundFx.playTap();
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
      setPresetId(null);
      setMode('upload');
      stopCamera();
      triggerAiScan(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: typeof PRESET_SAMPLE_MEALS[0]) => {
    soundFx.playTap();
    setPresetId(preset.id);
    setSelectedImage(preset.photoUrl);
    setMode('presets');
    stopCamera();
    triggerAiScan(preset.photoUrl, preset.id);
  };

  const handleSaveApiKey = () => {
    saveStoredGeminiApiKey(apiKeyInput);
    setShowApiKeyPrompt(false);
    soundFx.playSuccessChime();
    if (selectedImage) {
      triggerAiScan(selectedImage);
    }
  };

  const triggerAiScan = async (imageInput: string, pId?: string) => {
    setIsScanning(true);
    setErrorMessage(null);
    setAnalysisResult(null);

    const steps = [
      'Analyzing photo with AI Multimodal Vision...',
      'Identifying exact food items & ingredients...',
      'Estimating volume & portion weight (grams)...',
      'Computing clinical macronutrients & calories...',
    ];

    let stepIndex = 0;
    const stepTimer = setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length;
      setScanStepMessage(steps[stepIndex]);
    }, 450);

    try {
      const result = await analyzeFoodImageWithAI(
        imageInput,
        apiKeyInput || undefined,
        pId || presetId || undefined
      );

      clearInterval(stepTimer);
      setIsScanning(false);
      setAnalysisResult(result);
      // Never overwrite mealType if user or caller specified one
      if (!initialMealType && !userLockedMealType) {
        setSelectedMealType(result.mealType);
      }
      soundFx.playSuccessChime();
      triggerHaptic();
    } catch (err: unknown) {
      clearInterval(stepTimer);
      setIsScanning(false);
      const msg = err instanceof Error ? err.message : 'Photo analysis failed.';
      setErrorMessage(msg);
    }
  };

  // Portion & Item Manipulation
  const handleUpdateItemGrams = (itemIndex: number, newGrams: number) => {
    if (!analysisResult) return;
    const currentItem = analysisResult.items[itemIndex];
    if (!currentItem || newGrams <= 0) return;

    const originalGrams = currentItem.portionGrams || 100;
    const scale = newGrams / originalGrams;

    const updatedItem: FoodItemNutrition = {
      ...currentItem,
      portionGrams: newGrams,
      portionDescription: `${newGrams}g`,
      calories: Math.round(currentItem.calories * scale),
      protein: Number((currentItem.protein * scale).toFixed(1)),
      carbs: Number((currentItem.carbs * scale).toFixed(1)),
      fat: Number((currentItem.fat * scale).toFixed(1)),
      fiber: currentItem.fiber !== undefined ? Number((currentItem.fiber * scale).toFixed(1)) : undefined,
      sugar: currentItem.sugar !== undefined ? Number((currentItem.sugar * scale).toFixed(1)) : undefined,
      sodium: currentItem.sodium !== undefined ? Math.round(currentItem.sodium * scale) : undefined,
    };

    const newItems = [...analysisResult.items];
    newItems[itemIndex] = updatedItem;

    recalculateAndSetAnalysis(newItems);
  };

  const handleUpdateItemName = (itemIndex: number, newName: string) => {
    if (!analysisResult || !newName.trim()) return;
    const newItems = [...analysisResult.items];
    newItems[itemIndex] = { ...newItems[itemIndex], name: newName.trim() };
    recalculateAndSetAnalysis(newItems);
  };

  const handleDeleteItem = (itemIndex: number) => {
    if (!analysisResult) return;
    soundFx.playTap();
    triggerHaptic();

    const newItems = analysisResult.items.filter((_, idx) => idx !== itemIndex);
    recalculateAndSetAnalysis(newItems);
  };

  const handleAddSearchResult = (foodItem: typeof FOOD_DATABASE[0]) => {
    soundFx.playTap();
    const converted = convertEntryToNutritionItem(foodItem, foodItem.defaultPortionGrams);
    const newItems = analysisResult ? [...analysisResult.items, converted] : [converted];
    recalculateAndSetAnalysis(newItems);
    setSearchQuery('');
    setIsSearching(false);
  };

  const recalculateAndSetAnalysis = (items: FoodItemNutrition[]) => {
    if (!analysisResult && items.length === 0) return;

    const totalCalories = items.reduce((acc, i) => acc + i.calories, 0);
    const totalProtein = Number(items.reduce((acc, i) => acc + i.protein, 0).toFixed(1));
    const totalCarbs = Number(items.reduce((acc, i) => acc + i.carbs, 0).toFixed(1));
    const totalFat = Number(items.reduce((acc, i) => acc + i.fat, 0).toFixed(1));
    const totalFiber = Number(items.reduce((acc, i) => acc + (i.fiber || 0), 0).toFixed(1));
    const totalSugar = Number(items.reduce((acc, i) => acc + (i.sugar || 0), 0).toFixed(1));
    const totalSodium = Math.round(items.reduce((acc, i) => acc + (i.sodium || 0), 0));

    setAnalysisResult(prev => ({
      title: prev?.title || (items[0] ? `${items[0].name} Plate` : 'Logged Meal'),
      mealType: prev?.mealType || selectedMealType,
      items,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      totalFiber,
      totalSugar,
      totalSodium,
      confidenceScore: prev?.confidenceScore || 0.94,
      disclaimer: prev?.disclaimer || 'Verified nutritional items.',
      photoUri: selectedImage || undefined,
      source: prev?.source || 'gemini_api'
    }));
  };

  const handleSaveMeal = () => {
    if (!analysisResult) return;
    soundFx.playSuccessChime();
    triggerHaptic();

    const now = new Date();
    const mealLog: MealLog = {
      id: `meal-${Date.now()}`,
      userId: profile.id,
      date: selectedDate,
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      mealType: selectedMealType,
      title: analysisResult.title,
      photoUri: selectedImage || undefined,
      items: analysisResult.items,
      totalCalories: analysisResult.totalCalories,
      totalProtein: analysisResult.totalProtein,
      totalCarbs: analysisResult.totalCarbs,
      totalFat: analysisResult.totalFat,
      totalFiber: analysisResult.totalFiber,
      totalSugar: analysisResult.totalSugar,
      totalSodium: analysisResult.totalSodium,
      aiAnalyzed: true,
      confidenceScore: analysisResult.confidenceScore,
      disclaimer: analysisResult.disclaimer,
      userModified: true,
      createdAt: now.toISOString(),
    };

    onMealSaved(mealLog);
    onClose();
  };

  if (!isOpen) return null;

  const searchResults = searchQuery.trim().length >= 2 
    ? lookupFoodByQuery(searchQuery)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-obsidian-900 w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-obsidian-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Direct AI Food Lens
                </h2>
                {apiKeyInput ? (
                  <button
                    onClick={() => setShowApiKeyPrompt(!showApiKeyPrompt)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 hover:bg-emerald-500/20 transition flex items-center gap-1"
                    title="Gemini Multimodal AI is active. Click to update key."
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>Gemini AI Active</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowApiKeyPrompt(true)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30 hover:bg-amber-500/20 transition flex items-center gap-1 animate-pulse"
                  >
                    <Key className="w-3 h-3" />
                    <span>Connect Free AI Key</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct AI vision identifies exact dishes, dals, onions, curries, fruits & calculates clinical macros
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenManualLogger && (
              <button
                onClick={() => {
                  soundFx.playTap();
                  stopCamera();
                  onClose();
                  onOpenManualLogger();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-obsidian-800 hover:bg-slate-300 dark:hover:bg-obsidian-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
                title="Switch to Manual Food Logger"
              >
                <PenLine className="w-3.5 h-3.5 text-emerald-500" />
                <span>Manual Entry</span>
              </button>
            )}

            <button
              onClick={() => { soundFx.playTap(); stopCamera(); onClose(); }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-obsidian-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* Gemini API Key Configuration Drawer */}
          {showApiKeyPrompt && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-slate-800 dark:text-slate-200 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Key className="w-4 h-4" />
                  Google Gemini Vision AI Setup (Direct Photo Recognition)
                </span>
                <button
                  onClick={() => setShowApiKeyPrompt(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold"
                >
                  ✕ Close
                </button>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                To directly recognize <strong>any customized food, dal, onions, curries, fruits, snacks, or plate components</strong> using Google's generative AI vision, paste your Gemini API key below. Stored securely in your private browser memory.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste AIzaSy... API key here"
                  className="flex-1 bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveApiKey}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md transition whitespace-nowrap"
                  >
                    Save & Activate AI
                  </button>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-obsidian-800 hover:bg-slate-300 dark:hover:bg-obsidian-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition whitespace-nowrap flex items-center gap-1"
                  >
                    Get Free Key ↗
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Capture / Select Mode Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-obsidian-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              <button
                onClick={() => { soundFx.playTap(); startCamera(isFrontCamera); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
                  mode === 'camera' 
                    ? 'bg-white dark:bg-obsidian-800 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Live Camera</span>
              </button>
              <label className={`flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer transition ${
                mode === 'upload' 
                  ? 'bg-white dark:bg-obsidian-800 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}>
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
              <button
                onClick={() => { soundFx.playTap(); setMode('presets'); stopCamera(); }}
                className={`px-3 py-1.5 rounded-lg transition ${
                  mode === 'presets' 
                    ? 'bg-white dark:bg-obsidian-800 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sample Dishes
              </button>
            </div>

            {/* Meal Type Picker */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-obsidian-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(m => (
                <button
                  key={m}
                  onClick={() => { soundFx.playTap(); setSelectedMealType(m); }}
                  className={`px-2.5 py-1 rounded-lg capitalize transition ${
                    selectedMealType === m
                      ? 'bg-emerald-500 text-white shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Camera Viewfinder Screen */}
          {mode === 'camera' && isCameraActive && (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800 shadow-inner">
              <video 
                ref={videoRef} 
                playsInline 
                autoPlay 
                muted 
                className="w-full h-full object-cover" 
              />
              
              {/* Viewfinder Target Reticle */}
              <div className="absolute inset-6 sm:inset-8 border-2 border-dashed border-emerald-400/60 rounded-2xl pointer-events-none flex items-center justify-center">
                <span className="text-[11px] font-semibold text-emerald-400 bg-black/70 px-3 py-1 rounded-full backdrop-blur-sm shadow-md">
                  Align food inside frame & tap capture
                </span>
              </div>

              {/* Top Controls Overlay */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  onClick={toggleCameraFacing}
                  className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition shadow-lg"
                  title="Switch Camera (Front/Rear)"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Shutter & Gallery Controls */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-6">
                {/* Direct Gallery Pick Shortcut */}
                <label 
                  className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition cursor-pointer flex items-center justify-center shadow-lg active:scale-95"
                  title="Upload already taken photo from Gallery"
                >
                  <ImageIcon className="w-5 h-5 text-emerald-400" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>

                {/* Camera Shutter Capture Button */}
                <button
                  onClick={capturePhotoFromCamera}
                  className="w-16 h-16 rounded-full bg-white p-1 shadow-2xl hover:scale-105 active:scale-95 transition flex items-center justify-center border-4 border-emerald-500"
                  title="Capture Live Photo"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-inner">
                    <Camera className="w-6 h-6" />
                  </div>
                </button>

                {/* Manual Log Switch Shortcut */}
                {onOpenManualLogger && (
                  <button
                    onClick={() => {
                      soundFx.playTap();
                      stopCamera();
                      onClose();
                      onOpenManualLogger();
                    }}
                    className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition flex items-center justify-center shadow-lg active:scale-95"
                    title="Add Meal Manually"
                  >
                    <PenLine className="w-5 h-5 text-amber-400" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Camera Inactive / Permission Fallback Screen */}
          {mode === 'camera' && !isCameraActive && !isScanning && !analysisResult && (
            <div className="rounded-2xl bg-slate-50 dark:bg-obsidian-950 p-6 sm:p-8 text-center border border-dashed border-slate-300 dark:border-slate-800 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Camera className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Live Camera Inactive or Unsupported
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                  Upload an already taken food picture from your photo gallery, or enter the meal details manually.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <label className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 cursor-pointer transition active:scale-95">
                  <UploadCloud className="w-4 h-4" />
                  <span>Choose Photo from Gallery / Device</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>

                {onOpenManualLogger && (
                  <button
                    onClick={() => {
                      soundFx.playTap();
                      stopCamera();
                      onClose();
                      onOpenManualLogger();
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-obsidian-800 hover:bg-slate-300 dark:hover:bg-obsidian-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                  >
                    <PenLine className="w-4 h-4 text-emerald-500" />
                    <span>Add Meal Manually</span>
                  </button>
                )}

                <button
                  onClick={() => startCamera(isFrontCamera)}
                  className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
                >
                  Retry Camera
                </button>
              </div>
            </div>
          )}

          {/* Photo Upload Dropzone Screen */}
          {mode === 'upload' && !isScanning && !analysisResult && (
            <div className="rounded-2xl bg-slate-50 dark:bg-obsidian-950 p-6 sm:p-10 text-center border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 transition space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner">
                <UploadCloud className="w-8 h-8 animate-bounce-subtle" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Upload an Already Taken Photo
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                  Select any photo from your phone's gallery, camera roll, or computer. AI vision will automatically identify dishes, ingredients & calculate nutrition.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <label className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold text-xs shadow-xl shadow-emerald-500/25 cursor-pointer transition transform active:scale-95">
                  <ImageIcon className="w-4 h-4" />
                  <span>Select Photo from Gallery / Files</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>

                {onOpenManualLogger && (
                  <button
                    onClick={() => {
                      soundFx.playTap();
                      stopCamera();
                      onClose();
                      onOpenManualLogger();
                    }}
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-200 dark:bg-obsidian-800 hover:bg-slate-300 dark:hover:bg-obsidian-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                  >
                    <PenLine className="w-4 h-4 text-emerald-500" />
                    <span>Or Add Meal Manually</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Preset Sample Gallery */}
          {mode === 'presets' && !isScanning && !analysisResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Select a Curated Dish to Test AI Vision:</span>
                <span className="text-emerald-500">Curated Datasets</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_SAMPLE_MEALS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className="flex gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-obsidian-950/70 border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/50 hover:bg-emerald-500/5 dark:hover:bg-emerald-950/20 cursor-pointer transition group"
                  >
                    <img
                      src={preset.photoUrl}
                      alt={preset.name}
                      className="w-20 h-20 rounded-xl object-cover shadow-sm group-hover:scale-105 transition"
                    />
                    <div className="flex flex-col justify-center flex-1">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-500 transition">
                        {preset.name}
                      </span>
                      <span className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                        {preset.subtitle}
                      </span>
                      <span className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 mt-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> {preset.items.length} items decomposed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scanning Animation State */}
          {isScanning && (
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video flex flex-col items-center justify-center p-6 text-center border border-slate-800">
              {selectedImage && (
                <img src={selectedImage} alt="Scanning" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm" />
              )}
              
              {/* Laser Scanning Line */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400/80 animate-scan-laser" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 animate-pulse">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  AI Analyzing Food Image
                </h3>
                <p className="text-xs font-mono text-emerald-400 tracking-wide animate-pulse">
                  {scanStepMessage}
                </p>
              </div>
            </div>
          )}

          {/* Error Message if any */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Multi-Item Recognition Results & Verification Step */}
          {analysisResult && !isScanning && (
            <div className="space-y-4">
              
              {/* One-Tap Quick Food / Fruit Identifier Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Quick Confirm / Switch Food Item:
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
                  {[
                    { name: 'Fresh Red Apple', emoji: '🍎', portionGrams: 150, calories: 95, protein: 0.5, carbs: 25.0, fat: 0.3, fiber: 4.4, category: 'fruit' },
                    { name: 'Fresh Banana', emoji: '🍌', portionGrams: 120, calories: 105, protein: 1.3, carbs: 27.0, fat: 0.4, fiber: 3.1, category: 'fruit' },
                    { name: 'Fresh Orange', emoji: '🍊', portionGrams: 130, calories: 62, protein: 1.2, carbs: 15.4, fat: 0.2, fiber: 3.1, category: 'fruit' },
                    { name: 'Garden Green Salad', emoji: '🥗', portionGrams: 150, calories: 35, protein: 2.0, carbs: 6.0, fat: 0.5, fiber: 2.8, category: 'vegetable' },
                    { name: 'Black Coffee / Americano', emoji: '☕', portionGrams: 200, calories: 5, protein: 0.3, carbs: 0.6, fat: 0.1, fiber: 0, category: 'beverage' },
                    { name: 'Whole Wheat Toast & Egg', emoji: '🥪', portionGrams: 140, calories: 280, protein: 13.0, carbs: 26.0, fat: 12.0, fiber: 3.5, category: 'mixed' },
                    { name: 'Steamed Rice & Dal', emoji: '🍚', portionGrams: 250, calories: 320, protein: 11.0, carbs: 58.0, fat: 4.5, fiber: 6.2, category: 'grain' },
                    { name: 'Boiled Eggs (2 pcs)', emoji: '🥚', portionGrams: 100, calories: 143, protein: 12.6, carbs: 0.8, fat: 9.5, fiber: 0, category: 'protein' },
                    { name: 'Grilled Chicken Breast', emoji: '🍗', portionGrams: 150, calories: 247, protein: 46.5, carbs: 0, fat: 5.4, fiber: 0, category: 'protein' }
                  ].map((f) => (
                    <button
                      key={f.name}
                      onClick={() => {
                        soundFx.playTap();
                        const item: FoodItemNutrition = {
                          id: `quick-${Date.now()}`,
                          name: f.name,
                          portionGrams: f.portionGrams,
                          portionDescription: `${f.portionGrams}g`,
                          calories: f.calories,
                          protein: f.protein,
                          carbs: f.carbs,
                          fat: f.fat,
                          fiber: f.fiber,
                          category: f.category as any,
                          plateLocation: 'Center',
                          confidence: 0.98
                        };
                        recalculateAndSetAnalysis([item]);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-obsidian-950 hover:bg-emerald-500/10 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0 flex items-center gap-1 transition active:scale-95"
                    >
                      <span>{f.emoji}</span>
                      <span>{f.name.split(' ')[1] || f.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Image & Main Summary Header */}
              <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-obsidian-950/80 border border-slate-200 dark:border-slate-800">
                {selectedImage && (
                  <div className="relative w-full sm:w-36 h-28 rounded-xl overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700">
                    <img src={selectedImage} alt="Food Plate" className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-bold text-white backdrop-blur-sm flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {Math.round(analysisResult.confidenceScore * 100)}% Match
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={analysisResult.title}
                        onChange={(e) => setAnalysisResult({ ...analysisResult, title: e.target.value })}
                        className="text-base font-bold text-slate-800 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-400 focus:border-emerald-500 focus:outline-none w-full"
                        title="Click to rename meal"
                      />
                      <button
                        onClick={() => triggerAiScan(selectedImage || '')}
                        className="p-1 text-slate-400 hover:text-emerald-500 transition"
                        title="Re-analyze photo"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Identified {analysisResult.items.length} distinct item{analysisResult.items.length > 1 ? 's' : ''}. Tap any item below to fine-tune grams.
                    </p>
                  </div>

                  {/* Macro Badges */}
                  <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                    <div className="bg-white dark:bg-obsidian-900 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <span className="block text-[10px] font-semibold text-slate-500">Calories</span>
                      <strong className="text-sm font-black text-slate-800 dark:text-slate-100">{analysisResult.totalCalories}</strong>
                      <span className="text-[9px] text-slate-400 block">kcal</span>
                    </div>
                    <div className="bg-white dark:bg-obsidian-900 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <span className="block text-[10px] font-semibold text-indigo-500">Protein</span>
                      <strong className="text-sm font-black text-indigo-600 dark:text-indigo-400">{analysisResult.totalProtein}g</strong>
                      <span className="text-[9px] text-slate-400 block">macros</span>
                    </div>
                    <div className="bg-white dark:bg-obsidian-900 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <span className="block text-[10px] font-semibold text-amber-500">Carbs</span>
                      <strong className="text-sm font-black text-amber-600 dark:text-amber-400">{analysisResult.totalCarbs}g</strong>
                      <span className="text-[9px] text-slate-400 block">macros</span>
                    </div>
                    <div className="bg-white dark:bg-obsidian-900 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <span className="block text-[10px] font-semibold text-rose-500">Fats</span>
                      <strong className="text-sm font-black text-rose-600 dark:text-rose-400">{analysisResult.totalFat}g</strong>
                      <span className="text-[9px] text-slate-400 block">macros</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overall Plate Health Condition Warning Accordion */}
              {(() => {
                const plateEval = evaluateFoodForHealthConditions({
                  name: analysisResult.title,
                  calories: analysisResult.totalCalories,
                  carbs: analysisResult.totalCarbs,
                  sugar: analysisResult.totalSugar,
                  sodium: analysisResult.totalSodium,
                  fat: analysisResult.totalFat,
                  protein: analysisResult.totalProtein
                }, profile.healthConditions || []);

                if (!plateEval.hasWarnings) return null;

                return (
                  <FoodHealthWarningAccordion
                    warnings={plateEval.warnings}
                    highestSeverity={plateEval.highestSeverity}
                  />
                );
              })()}

              {/* Decomposed Items List & Verification */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-500" />
                    Verify & Edit Food Items ({analysisResult.items.length})
                  </span>
                  <button
                    onClick={() => setIsSearching(!isSearching)}
                    className="text-emerald-500 hover:text-emerald-600 text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item from Database</span>
                  </button>
                </div>

                {/* Instant Database Search Drawer */}
                {isSearching && (
                  <div className="p-3 rounded-2xl bg-slate-100 dark:bg-obsidian-950 border border-emerald-500/30 space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search 500+ foods (e.g. apple, oats, chicken, paneer, salad)..."
                        className="w-full bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white"
                        autoFocus
                      />
                    </div>

                    {searchResults.length > 0 && (
                      <div className="max-h-48 overflow-y-auto space-y-1 pt-1">
                        {searchResults.slice(0, 5).map((f, i) => (
                          <button
                            key={`${f.name}-${i}`}
                            onClick={() => handleAddSearchResult(f)}
                            className="w-full text-left p-2 rounded-xl bg-white dark:bg-obsidian-900 hover:bg-emerald-500/10 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs transition"
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-200">{f.name}</span>
                            <span className="text-slate-400 font-mono">{f.caloriesPer100g} kcal / 100g</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {analysisResult.items.map((item, index) => {
                    const itemEval = evaluateFoodForHealthConditions({
                      name: item.name,
                      calories: item.calories,
                      carbs: item.carbs,
                      sugar: item.sugar,
                      sodium: item.sodium,
                      fat: item.fat,
                      protein: item.protein
                    }, profile.healthConditions || []);

                    const cardBorder = itemEval.highestSeverity === 'severe_red'
                      ? 'border-rose-500/40 bg-rose-500/[0.02]'
                      : itemEval.highestSeverity === 'warning_orange'
                      ? 'border-amber-500/40 bg-amber-500/[0.02]'
                      : itemEval.highestSeverity === 'caution_yellow'
                      ? 'border-yellow-500/40'
                      : 'border-slate-200 dark:border-slate-800/80';

                    return (
                      <div
                        key={item.id || index}
                        className={`bg-white dark:bg-obsidian-950 p-3.5 rounded-2xl border ${cardBorder} hover:border-slate-300 dark:hover:border-slate-700 transition`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              itemEval.highestSeverity === 'severe_red'
                                ? 'bg-rose-500'
                                : itemEval.highestSeverity === 'warning_orange'
                                ? 'bg-amber-500'
                                : itemEval.highestSeverity === 'caution_yellow'
                                ? 'bg-yellow-500'
                                : 'bg-emerald-500'
                            }`} />
                            <div className="flex-1">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateItemName(index, e.target.value)}
                                className="text-xs font-bold text-slate-800 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-400 focus:border-emerald-500 focus:outline-none w-full"
                              />
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                <span>{item.portionGrams}g</span>
                                <span>&bull;</span>
                                <span>P: {item.protein}g</span>
                                <span>C: {item.carbs}g</span>
                                <span>F: {item.fat}g</span>
                                {item.fiber ? <span>&bull; Fib: {item.fiber}g</span> : null}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {item.calories} <span className="text-[10px] font-normal text-slate-400">kcal</span>
                            </span>
                            
                            <button
                              onClick={() => {
                                soundFx.playTap();
                                setEditingItemIndex(editingItemIndex === index ? null : index);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-obsidian-800 transition"
                              title="Adjust portion"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteItem(index)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Health Condition Item Warning Accordion */}
                        {itemEval.hasWarnings && (
                          <FoodHealthWarningAccordion
                            warnings={itemEval.warnings}
                            highestSeverity={itemEval.highestSeverity}
                            compact
                          />
                        )}

                      {/* Interactive Gram Portion Slider */}
                      {editingItemIndex === index && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-obsidian-900/50 -mx-3.5 -mb-3.5 p-3.5 rounded-b-2xl">
                          <div className="flex justify-between items-center text-xs mb-1.5 font-semibold text-slate-700 dark:text-slate-300">
                            <span>Adjust Portion Weight:</span>
                            <span className="text-emerald-500 font-bold">{item.portionGrams} grams</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="10"
                              max="600"
                              step="5"
                              value={item.portionGrams}
                              onChange={(e) => handleUpdateItemGrams(index, Number(e.target.value))}
                              className="w-full accent-emerald-500 cursor-pointer"
                            />
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => handleUpdateItemGrams(index, Math.round(item.portionGrams * 0.8))}
                                className="px-2 py-1 rounded bg-slate-200 dark:bg-obsidian-800 text-[10px] font-bold"
                              >
                                -20%
                              </button>
                              <button
                                onClick={() => handleUpdateItemGrams(index, Math.round(item.portionGrams * 1.25))}
                                className="px-2 py-1 rounded bg-slate-200 dark:bg-obsidian-800 text-[10px] font-bold"
                              >
                                +25%
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>

              </div>

              {/* Category Confirmation & Selector Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Log this meal to:
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-lg bg-emerald-500 text-white font-extrabold capitalize shadow-sm">
                    {selectedMealType}
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-white/80 dark:bg-obsidian-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        soundFx.playTap();
                        setSelectedMealType(m);
                        setUserLockedMealType(true);
                      }}
                      className={`px-3 py-1 rounded-lg capitalize transition ${
                        selectedMealType === m
                          ? 'bg-emerald-500 text-white shadow-sm font-extrabold'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Disclaimer Notice */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-100 dark:bg-obsidian-950/60 text-[11px] text-slate-500 border border-slate-200/60 dark:border-slate-800/60">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  {analysisResult.disclaimer}
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-obsidian-950 flex items-center justify-between">
          <button
            onClick={() => { soundFx.playTap(); onClose(); }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-obsidian-800 transition"
          >
            Cancel
          </button>

          {analysisResult && (
            <button
              onClick={handleSaveMeal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition transform active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Post Meal ({analysisResult.totalCalories} kcal)</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
