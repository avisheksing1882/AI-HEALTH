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
  ChevronRight
} from 'lucide-react';
import { FoodItemNutrition, MealLog, MealType, UserProfile } from '../types';
import { analyzeFoodImageWithAI, saveUserFoodCorrection, VisionAnalysisResult } from '../services/geminiVision';
import { PRESET_SAMPLE_MEALS, FOOD_DATABASE, convertEntryToNutritionItem } from '../services/foodCatalog';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface AIFoodScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMealSaved: (meal: MealLog) => void;
  profile: UserProfile;
  selectedDate: string;
}

export const AIFoodScannerModal: React.FC<AIFoodScannerModalProps> = ({
  isOpen,
  onClose,
  onMealSaved,
  profile,
  selectedDate,
}) => {
  const [mode, setMode] = useState<'camera' | 'upload' | 'presets'>('presets');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepMessage, setScanStepMessage] = useState('Initializing AI Vision...');
  const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResult | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch');
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Camera stream refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize meal type based on time of day
  useEffect(() => {
    if (isOpen) {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 11) setSelectedMealType('breakfast');
      else if (hour >= 11 && hour < 16) setSelectedMealType('lunch');
      else if (hour >= 16 && hour < 19) setSelectedMealType('snack');
      else setSelectedMealType('dinner');
      
      // Auto-load first preset as ready-to-test
      setPresetId(PRESET_SAMPLE_MEALS[0].id);
      setSelectedImage(PRESET_SAMPLE_MEALS[0].photoUrl);
    } else {
      stopCamera();
      setSelectedImage(null);
      setAnalysisResult(null);
      setIsScanning(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const [isFrontCamera, setIsFrontCamera] = useState(false);

  // Attach video stream whenever videoRef and streamRef are ready
  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => console.warn('Error starting video stream:', err));
    }
  }, [isCameraActive]);

  const startCamera = async (front: boolean = false) => {
    try {
      setErrorMessage(null);
      setAnalysisResult(null);
      setPresetId(null);
      setMode('camera');

      // Stop any existing stream
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
        // Fallback to any available camera (laptop webcam, front camera)
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      setIsCameraActive(true);

      // Also directly assign if ref is already mounted
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      setErrorMessage(
        isDenied
          ? 'Camera permission denied. Please allow camera permissions in your browser URL bar.'
          : 'Could not access camera hardware. You can upload a photo or select a sample dish.'
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
      triggerAiScan(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: typeof PRESET_SAMPLE_MEALS[0]) => {
    soundFx.playTap();
    setPresetId(preset.id);
    setSelectedImage(preset.photoUrl);
    setMode('presets');
    triggerAiScan(preset.photoUrl, preset.id);
  };

  const triggerAiScan = async (imageInput: string, pId?: string) => {
    setIsScanning(true);
    setErrorMessage(null);
    setAnalysisResult(null);

    const steps = [
      'Scanning plate contours...',
      'Segmenting multi-dish components...',
      'Estimating volume & gram portions...',
      'Calculating macronutrients & calories...',
    ];

    let stepIndex = 0;
    const stepTimer = setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length;
      setScanStepMessage(steps[stepIndex]);
    }, 400);

    try {
      const result = await analyzeFoodImageWithAI(
        imageInput,
        profile.geminiApiKey,
        pId || presetId || undefined
      );

      clearInterval(stepTimer);
      setIsScanning(false);
      setAnalysisResult(result);
      setSelectedMealType(result.mealType);
      soundFx.playSuccessChime();
      triggerHaptic();
    } catch (err: unknown) {
      clearInterval(stepTimer);
      setIsScanning(false);
      const msg = err instanceof Error ? err.message : 'Photo analysis failed.';
      setErrorMessage(msg + ' You can manually edit or adjust the items below.');
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

    recalculateTotals(newItems);
  };

  const handleDeleteItem = (itemIndex: number) => {
    if (!analysisResult) return;
    soundFx.playTap();
    const newItems = analysisResult.items.filter((_, idx) => idx !== itemIndex);
    recalculateTotals(newItems);
  };

  const handleAddExtraFood = (foodName: string) => {
    if (!analysisResult) return;
    const found = FOOD_DATABASE.find(f => f.name.toLowerCase().includes(foodName.toLowerCase())) || FOOD_DATABASE[0];
    const newItem = convertEntryToNutritionItem(found);

    const newItems = [...analysisResult.items, newItem];
    recalculateTotals(newItems);
  };

  const recalculateTotals = (items: FoodItemNutrition[]) => {
    if (!analysisResult) return;
    const totalCalories = items.reduce((acc, i) => acc + i.calories, 0);
    const totalProtein = Number(items.reduce((acc, i) => acc + i.protein, 0).toFixed(1));
    const totalCarbs = Number(items.reduce((acc, i) => acc + i.carbs, 0).toFixed(1));
    const totalFat = Number(items.reduce((acc, i) => acc + i.fat, 0).toFixed(1));
    const totalFiber = Number(items.reduce((acc, i) => acc + (i.fiber || 0), 0).toFixed(1));
    const totalSugar = Number(items.reduce((acc, i) => acc + (i.sugar || 0), 0).toFixed(1));
    const totalSodium = Math.round(items.reduce((acc, i) => acc + (i.sodium || 0), 0));

    setAnalysisResult({
      ...analysisResult,
      items,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      totalFiber,
      totalSugar,
      totalSodium
    });
  };

  const handleSaveMeal = async () => {
    if (!analysisResult || analysisResult.items.length === 0) return;

    soundFx.playRingCelebration();
    triggerHaptic();

    // Save learned corrections for any user-adjusted portions
    for (const item of analysisResult.items) {
      await saveUserFoodCorrection(
        profile.id,
        item.name,
        item.name,
        item.portionGrams,
        item.portionGrams
      );
    }

    const now = new Date();
    const mealLog: MealLog = {
      id: `meal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
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
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                AI Food Lens & Calorie Estimator
                {profile.geminiApiKey ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                    Gemini Live
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-500/20">
                    Neural Vision Engine
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Snap or upload any multi-item plate for automated item-by-item nutrition breakdown
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* Capture / Select Mode Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-obsidian-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
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
              <button
                onClick={() => { soundFx.playTap(); startCamera(); }}
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
                  Align plate inside frame
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

              {/* Shutter Capture Button */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4">
                <button
                  onClick={capturePhotoFromCamera}
                  className="w-16 h-16 rounded-full bg-white p-1 shadow-2xl hover:scale-105 active:scale-95 transition flex items-center justify-center border-4 border-emerald-500"
                  title="Capture Photo"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-inner">
                    <Camera className="w-6 h-6" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Preset Sample Gallery */}
          {mode === 'presets' && !isScanning && !analysisResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Select a Curated Multi-Item Plate to Scan:</span>
                <span className="text-emerald-500">Instant AI Demo</span>
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
                  Decomposing Food Plate
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

          {/* Multi-Item Recognition Results */}
          {analysisResult && !isScanning && (
            <div className="space-y-4">
              
              {/* Image & Main Summary Header */}
              <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-obsidian-950/80 border border-slate-200 dark:border-slate-800">
                {selectedImage && (
                  <div className="relative w-full sm:w-36 h-28 rounded-xl overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700">
                    <img src={selectedImage} alt="Food Plate" className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-bold text-white backdrop-blur-sm">
                      {Math.round(analysisResult.confidenceScore * 100)}% Match
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        {analysisResult.title}
                      </h3>
                      <button
                        onClick={() => triggerAiScan(selectedImage || '')}
                        className="p-1 text-slate-400 hover:text-emerald-500 transition"
                        title="Re-analyze photo"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Identified {analysisResult.items.length} distinct ingredients with automated portion estimation.
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

              {/* Decomposed Items List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-500" />
                    Plate Breakdown (Tap item to adjust grams)
                  </span>
                  <span className="text-slate-500 font-normal text-[11px]">
                    {analysisResult.items.length} items
                  </span>
                </div>

                <div className="space-y-2">
                  {analysisResult.items.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="bg-white dark:bg-obsidian-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                {item.name}
                              </span>
                              {item.plateLocation && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-obsidian-800 text-slate-500">
                                  {item.plateLocation}
                                </span>
                              )}
                            </div>
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
                              max="500"
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
                  ))}
                </div>

                {/* Add Missed Item Shortcut */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleAddExtraFood('roti')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-obsidian-950 text-slate-600 dark:text-slate-400 text-[11px] font-semibold hover:bg-slate-200 dark:hover:bg-obsidian-800 transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> + Extra Roti
                  </button>
                  <button
                    onClick={() => handleAddExtraFood('curd')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-obsidian-950 text-slate-600 dark:text-slate-400 text-[11px] font-semibold hover:bg-slate-200 dark:hover:bg-obsidian-800 transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> + Curd
                  </button>
                  <button
                    onClick={() => handleAddExtraFood('salad')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-obsidian-950 text-slate-600 dark:text-slate-400 text-[11px] font-semibold hover:bg-slate-200 dark:hover:bg-obsidian-800 transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> + Green Salad
                  </button>
                </div>
              </div>

              {/* Disclaimer Notice */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-100 dark:bg-obsidian-950/60 text-[11px] text-slate-500 border border-slate-200/60 dark:border-slate-800/60">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  {analysisResult.disclaimer} Your portion tweaks are saved to refine future AI accuracy.
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
              <span>Log Meal ({analysisResult.totalCalories} kcal)</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
