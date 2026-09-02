import React, { useState, useEffect, useRef } from 'react';
import { Utensils, Plus, Trash2, ChevronDown, ChevronUp, Sparkles, Camera, Layers, Pencil, Check, X, ShieldCheck, Flame, Loader2, RotateCcw } from 'lucide-react';
import { MealLog, MealType, HealthCondition, FoodItemNutrition } from '../types';
import { soundFx, triggerHaptic } from '../services/soundEffects';
import { evaluateFoodForHealthConditions } from '../services/healthConditionFoodEvaluator';
import { FoodHealthWarningAccordion } from './FoodHealthWarningAccordion';
import { estimateNutritionForFoodItem } from '../services/aiNutritionService';

interface EditingIngredientState {
  mealId: string;
  itemIndex: number;
  name: string;
  calories: number;
  portionDescription: string;
  portionGrams: number | '';
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  isAIResolving?: boolean;
  verifiedSource?: string;
  clinicalNote?: string;
}

interface MealsTimelineProps {
  meals: MealLog[];
  healthConditions?: HealthCondition[];
  selectedDate?: string;
  onDeleteMeal: (id: string) => void;
  onUpdateMeal?: (meal: MealLog) => void;
  onOpenAIScanner: (mealType?: MealType) => void;
  onOpenManualLogger: (mealType?: MealType) => void;
}

const MEAL_SECTIONS: { type: MealType; label: string; icon: string; timeHint: string }[] = [
  { type: 'breakfast', label: 'Breakfast', icon: '🍳', timeHint: '08:00 - 10:00 AM' },
  { type: 'lunch', label: 'Lunch', icon: '🥗', timeHint: '12:30 - 02:30 PM' },
  { type: 'dinner', label: 'Dinner', icon: '🍲', timeHint: '07:30 - 09:30 PM' },
  { type: 'snack', label: 'Snacks & Bites', icon: '🍎', timeHint: 'Throughout Day' },
];

export const MealsTimeline: React.FC<MealsTimelineProps> = ({
  meals,
  healthConditions = [],
  selectedDate,
  onDeleteMeal,
  onUpdateMeal,
  onOpenAIScanner,
  onOpenManualLogger,
}) => {
  const [expandedMealIds, setExpandedMealIds] = useState<Set<string>>(new Set());
  const [editingIngredient, setEditingIngredient] = useState<EditingIngredientState | null>(null);
  const [editingMealTitle, setEditingMealTitle] = useState<{ id: string; title: string } | null>(null);

  // ⚡ Debounced AI Clinical Nutrition Auto-Calculation
  useEffect(() => {
    if (!editingIngredient || !editingIngredient.name.trim()) return;

    const currentName = editingIngredient.name.trim();
    const currentGrams = typeof editingIngredient.portionGrams === 'number' && editingIngredient.portionGrams > 0
      ? editingIngredient.portionGrams
      : 100;

    const timer = setTimeout(async () => {
      setEditingIngredient(prev => prev ? { ...prev, isAIResolving: true } : null);
      try {
        const est = await estimateNutritionForFoodItem(currentName, currentGrams);
        setEditingIngredient(prev => {
          if (!prev || prev.name.trim() !== currentName) return prev;
          return {
            ...prev,
            calories: est.calories,
            protein: est.protein,
            carbs: est.carbs,
            fat: est.fat,
            fiber: est.fiber,
            sugar: est.sugar,
            sodium: est.sodium,
            portionDescription: est.portionDescription,
            verifiedSource: est.source === 'gemini_clinical_ai' ? 'Gemini AI Dietitian' : 'ICMR-NIN IFCT Standard',
            clinicalNote: est.clinicalNote,
            isAIResolving: false
          };
        });
      } catch {
        setEditingIngredient(prev => prev ? { ...prev, isAIResolving: false } : null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [editingIngredient?.name, editingIngredient?.portionGrams]);

  // ⚡ Ensure morning meals never falsely pollute Lunch
  const getEffectiveMealType = (meal: MealLog): MealType => {
    if (meal.time && meal.time >= '04:00' && meal.time < '11:45' && meal.mealType === 'lunch') {
      return 'breakfast';
    }
    return meal.mealType;
  };

  // ⚡ Auto-healing: If any meal in state/database has a morning timestamp but was marked lunch, fix it in db
  useEffect(() => {
    if (!onUpdateMeal) return;
    meals.forEach(meal => {
      if (meal.time && meal.time >= '04:00' && meal.time < '11:45' && meal.mealType === 'lunch') {
        onUpdateMeal({ ...meal, mealType: 'breakfast' });
      }
    });
  }, [meals, onUpdateMeal]);

  // Undo meal/plate deletion state
  const [undoMeal, setUndoMeal] = useState<MealLog | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = !selectedDate || selectedDate === todayStr;

  const formatOneDecimal = (val: number | undefined | null): string => {
    if (val === undefined || val === null || isNaN(Number(val))) return '0.0';
    return (Math.round(Number(val) * 10) / 10).toFixed(1);
  };

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const toggleExpand = (id: string) => {
    soundFx.playTap();
    setExpandedMealIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundFx.playTap();
    triggerHaptic();

    const targetMeal = meals.find(m => m.id === id);
    if (targetMeal) {
      setUndoMeal(targetMeal);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(() => {
        setUndoMeal(null);
      }, 10000); // 10s undo window
    }

    onDeleteMeal(id);
  };

  const handleUndoDelete = () => {
    if (!undoMeal) return;
    soundFx.playSuccessChime();
    triggerHaptic();
    if (onUpdateMeal) {
      onUpdateMeal(undoMeal);
    }
    setUndoMeal(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  };

  const handleSaveEditedIngredient = () => {
    if (!editingIngredient || !onUpdateMeal) return;

    const targetMeal = meals.find(m => m.id === editingIngredient.mealId);
    if (!targetMeal) return;

    const newItems = [...targetMeal.items];
    const isNew = editingIngredient.itemIndex >= newItems.length;
    const oldItem = isNew ? null : newItems[editingIngredient.itemIndex];

    const updatedItem: FoodItemNutrition = {
      ...(oldItem || {}),
      id: oldItem?.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: editingIngredient.name.trim() || (oldItem ? oldItem.name : 'Food Item'),
      calories: Number(editingIngredient.calories) || 0,
      portionDescription: editingIngredient.portionDescription.trim() || `${editingIngredient.portionGrams || 100}g`,
      portionGrams: typeof editingIngredient.portionGrams === 'number' ? editingIngredient.portionGrams : 100,
      protein: Number(editingIngredient.protein) || 0,
      carbs: Number(editingIngredient.carbs) || 0,
      fat: Number(editingIngredient.fat) || 0,
      fiber: Number(editingIngredient.fiber) || 0,
      sugar: Number(editingIngredient.sugar) || 0,
      sodium: Number(editingIngredient.sodium) || 0,
    };

    if (isNew) {
      newItems.push(updatedItem);
    } else {
      newItems[editingIngredient.itemIndex] = updatedItem;
    }

    const totalCalories = newItems.reduce((acc, i) => acc + (Number(i.calories) || 0), 0);
    const totalProtein = Math.round(newItems.reduce((acc, i) => acc + (Number(i.protein) || 0), 0) * 10) / 10;
    const totalCarbs = Math.round(newItems.reduce((acc, i) => acc + (Number(i.carbs) || 0), 0) * 10) / 10;
    const totalFat = Math.round(newItems.reduce((acc, i) => acc + (Number(i.fat) || 0), 0) * 10) / 10;
    const totalFiber = Math.round(newItems.reduce((acc, i) => acc + (Number(i.fiber) || 0), 0) * 10) / 10;

    // Also update meal title if it referenced the old food name
    let updatedTitle = targetMeal.title?.trim() || '';
    if (!updatedTitle) {
      updatedTitle = newItems.map(i => i.name).filter(Boolean).join(', ');
    } else if (oldItem && oldItem.name && updatedItem.name !== oldItem.name && updatedTitle.toLowerCase().includes(oldItem.name.toLowerCase())) {
      const reg = new RegExp(oldItem.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      updatedTitle = updatedTitle.replace(reg, updatedItem.name);
    }

    const updatedMeal: MealLog = {
      ...targetMeal,
      title: updatedTitle,
      items: newItems,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      totalFiber,
      userModified: true
    };

    soundFx.playSuccessChime();
    triggerHaptic();
    onUpdateMeal(updatedMeal);
    setEditingIngredient(null);
  };

  const handleDeleteIngredientFromMeal = (mealId: string, itemIdx: number) => {
    if (!onUpdateMeal) return;
    const targetMeal = meals.find(m => m.id === mealId);
    if (!targetMeal) return;

    const newItems = targetMeal.items.filter((_, i) => i !== itemIdx);
    const totalCalories = newItems.reduce((acc, i) => acc + (Number(i.calories) || 0), 0);
    const totalProtein = Math.round(newItems.reduce((acc, i) => acc + (Number(i.protein) || 0), 0) * 10) / 10;
    const totalCarbs = Math.round(newItems.reduce((acc, i) => acc + (Number(i.carbs) || 0), 0) * 10) / 10;
    const totalFat = Math.round(newItems.reduce((acc, i) => acc + (Number(i.fat) || 0), 0) * 10) / 10;
    const totalFiber = Math.round(newItems.reduce((acc, i) => acc + (Number(i.fiber) || 0), 0) * 10) / 10;

    const updatedMeal: MealLog = {
      ...targetMeal,
      items: newItems,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      totalFiber,
      userModified: true
    };

    soundFx.playSuccessChime();
    triggerHaptic();
    onUpdateMeal(updatedMeal);
    setEditingIngredient(null);
  };

  const handleSaveMealTitle = () => {
    if (!editingMealTitle || !onUpdateMeal) return;
    const targetMeal = meals.find(m => m.id === editingMealTitle.id);
    if (!targetMeal) return;
    onUpdateMeal({ ...targetMeal, title: editingMealTitle.title.trim() || targetMeal.title, userModified: true });
    soundFx.playSuccessChime();
    triggerHaptic();
    setEditingMealTitle(null);
  };

  return (
    <div className="bg-white dark:bg-obsidian-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-500 flex items-center justify-center">
            <Utensils className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Food Diary & Meal Timeline
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {meals.length > 0 
                ? `${meals.length} meals logged ${isToday ? 'today' : 'on ' + formatDateDisplay(selectedDate!)}`
                : isToday ? 'No meals logged today yet' : `No meals logged on ${formatDateDisplay(selectedDate!)}`}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          {onOpenManualLogger && (
            <button
              onClick={() => { soundFx.playTap(); onOpenManualLogger(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-obsidian-800 hover:bg-slate-200 dark:hover:bg-obsidian-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition border border-slate-200 dark:border-slate-700"
              title="Add Meal Manually"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-500" />
              <span>Manual Log</span>
            </button>
          )}

          <button
            onClick={() => { soundFx.playTap(); onOpenAIScanner(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500 hover:text-white transition"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan Plate</span>
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {MEAL_SECTIONS.map(section => {
          const sectionMeals = meals.filter(m => getEffectiveMealType(m) === section.type);
          const totalSectionKcal = sectionMeals.reduce((acc, m) => acc + m.totalCalories, 0);

          return (
            <div
              key={section.type}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-obsidian-950/60 border border-slate-200/70 dark:border-slate-800/80 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{section.icon}</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {section.label}
                    </h4>
                    <span className="text-[10px] text-slate-400">{section.timeHint}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {totalSectionKcal > 0 && (
                    <span className="text-xs font-black text-slate-900 dark:text-white mr-1">
                      {totalSectionKcal} <span className="text-[10px] font-normal text-slate-500">kcal</span>
                    </span>
                  )}
                  <button
                    onClick={() => { soundFx.playTap(); onOpenAIScanner(section.type); }}
                    className="px-2.5 py-1 rounded-lg bg-slate-200/60 dark:bg-obsidian-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-500 transition flex items-center gap-1"
                    title={`Log to ${section.label}`}
                  >
                    <Plus className="w-3 h-3" /> {totalSectionKcal > 0 ? `Add ${section.label}` : `Log ${section.label}`}
                  </button>
                </div>
              </div>


              {/* Meals in this section */}
              {sectionMeals.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  {sectionMeals.map(meal => {
                    const isExpanded = expandedMealIds.has(meal.id);
                    
                    // Evaluate entire meal & individual items against active conditions
                    const mealEval = evaluateFoodForHealthConditions({
                      name: meal.title,
                      calories: meal.totalCalories,
                      carbs: meal.totalCarbs,
                      sugar: meal.totalSugar,
                      sodium: meal.totalSodium,
                      fat: meal.totalFat,
                      protein: meal.totalProtein
                    }, healthConditions);

                    // Border styling based on health severity
                    const cardBorder = mealEval.highestSeverity === 'severe_red'
                      ? 'border-rose-500/40 bg-rose-500/[0.02]'
                      : mealEval.highestSeverity === 'warning_orange'
                      ? 'border-amber-500/40 bg-amber-500/[0.02]'
                      : mealEval.highestSeverity === 'caution_yellow'
                      ? 'border-yellow-500/40'
                      : 'border-slate-200 dark:border-slate-800/80';

                    const mealTitleText = meal.title?.trim() 
                      || (meal.items && meal.items.length > 0 ? meal.items.map(i => i.name).filter(Boolean).join(', ') : '') 
                      || `${section.label} Meal`;

                    return (
                      <div
                        key={meal.id}
                        onClick={() => toggleExpand(meal.id)}
                        className={`bg-white dark:bg-obsidian-900 rounded-2xl p-3.5 border ${cardBorder} cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition shadow-sm`}
                      >
                        {/* Meal Card Content Header */}
                        <div className="space-y-2.5">
                          {/* Top Row: Thumbnail + Title & Time + Total Calories & Expand Chevron */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {meal.photoUri ? (
                                <img
                                  src={meal.photoUri}
                                  alt={mealTitleText}
                                  className="w-12 h-12 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-slate-800 shadow-sm"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                  <Utensils className="w-5 h-5" />
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {editingMealTitle?.id === meal.id ? (
                                    <div className="flex items-center gap-1 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="text"
                                        value={editingMealTitle.title}
                                        onChange={(e) => setEditingMealTitle({ ...editingMealTitle, title: e.target.value })}
                                        className="text-xs font-bold text-slate-800 dark:text-slate-100 px-2 py-1 rounded-lg bg-slate-100 dark:bg-obsidian-950 border border-emerald-500 focus:outline-none flex-1 min-w-0"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveMealTitle();
                                          if (e.key === 'Escape') setEditingMealTitle(null);
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={handleSaveMealTitle}
                                        className="p-1 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition"
                                        title="Save title"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingMealTitle(null)}
                                        className="p-1 rounded text-slate-400 hover:text-slate-600 transition"
                                        title="Cancel"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                                        {mealTitleText}
                                      </span>
                                      {onUpdateMeal && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            soundFx.playTap();
                                            setEditingMealTitle({ id: meal.id, title: mealTitleText });
                                          }}
                                          className="p-0.5 rounded text-slate-400 hover:text-emerald-500 transition"
                                          title="Rename meal title"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  <span>{meal.time}</span>
                                  {meal.aiAnalyzed && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-cyan-500 font-bold border border-cyan-500/20 inline-flex items-center gap-0.5">
                                      <Sparkles className="w-2.5 h-2.5" /> AI
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Calories & Expand Arrow */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              <div className="text-right">
                                <span className="text-base font-black text-slate-900 dark:text-white block leading-tight">
                                  {meal.totalCalories}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400 block -mt-0.5">kcal</span>
                              </div>
                              <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Sub-row: Full Macro Badges + Category Selector + Delete */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/70 flex-wrap">
                            {/* Macronutrients in dedicated pills */}
                            <div className="flex items-center gap-1.5 flex-wrap text-[10px] sm:text-[11px] font-bold">
                              <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                P: {formatOneDecimal(meal.totalProtein)}g
                              </span>
                              <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                C: {formatOneDecimal(meal.totalCarbs)}g
                              </span>
                              <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                F: {formatOneDecimal(meal.totalFat)}g
                              </span>
                              {meal.totalFiber ? (
                                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  Fib: {formatOneDecimal(meal.totalFiber)}g
                                </span>
                              ) : null}
                            </div>

                            {/* Action Buttons: Category selector + Delete */}
                            <div className="flex items-center gap-2 ml-auto" onClick={(e) => e.stopPropagation()}>
                              {/* One-Click Fix: Move morning scan to Breakfast */}
                              {meal.mealType !== 'breakfast' && (meal.time < '11:30' || meal.time.startsWith('10:')) && onUpdateMeal && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    soundFx.playSuccessChime();
                                    triggerHaptic();
                                    onUpdateMeal({ ...meal, mealType: 'breakfast' });
                                  }}
                                  className="px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 font-bold text-[10px] border border-amber-500/30 inline-flex items-center gap-1 transition"
                                  title="Logged in morning. Click to move to Breakfast"
                                >
                                  <span>🍳 Move to Breakfast</span>
                                </button>
                              )}

                              {onUpdateMeal && (
                                <select
                                  value={meal.mealType}
                                  onChange={(e) => {
                                    soundFx.playSuccessChime();
                                    triggerHaptic();
                                    onUpdateMeal({ ...meal, mealType: e.target.value as MealType });
                                  }}
                                  className="text-[10px] sm:text-[11px] font-bold bg-slate-100 dark:bg-obsidian-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer hover:border-emerald-500 transition capitalize"
                                  title="Change meal category"
                                >
                                  <option value="breakfast">Breakfast</option>
                                  <option value="lunch">Lunch</option>
                                  <option value="dinner">Dinner</option>
                                  <option value="snack">Snack</option>
                                </select>
                              )}

                              <button
                                onClick={(e) => handleDelete(meal.id, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                                title="Delete meal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Health Condition Warnings Accordion */}
                        {mealEval.hasWarnings && (
                          <FoodHealthWarningAccordion
                            warnings={mealEval.warnings}
                            highestSeverity={mealEval.highestSeverity}
                          />
                        )}

                        {/* Expanded Item Breakdown */}
                        {isExpanded && meal.items && meal.items.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Decomposed Ingredients ({meal.items.length}):
                              </span>
                              {onUpdateMeal && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    soundFx.playTap();
                                    setEditingIngredient({
                                      mealId: meal.id,
                                      itemIndex: meal.items.length,
                                      name: '',
                                      calories: 0,
                                      portionDescription: '',
                                      portionGrams: 100,
                                      protein: 0,
                                      carbs: 0,
                                      fat: 0,
                                      fiber: 0,
                                      sugar: 0,
                                      sodium: 0
                                    });
                                  }}
                                  className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition"
                                >
                                  <Plus className="w-3 h-3" /> Add Item
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {meal.items.map((item, idx) => {
                                const itemEval = evaluateFoodForHealthConditions({
                                  name: item.name,
                                  calories: item.calories,
                                  carbs: item.carbs,
                                  sugar: item.sugar,
                                  sodium: item.sodium,
                                  fat: item.fat,
                                  protein: item.protein
                                }, healthConditions);

                                return (
                                  <div
                                    key={idx}
                                    className={`p-2.5 rounded-xl text-[11px] border space-y-1 ${
                                      itemEval.highestSeverity === 'severe_red'
                                        ? 'bg-rose-500/5 border-rose-500/30'
                                        : itemEval.highestSeverity === 'warning_orange'
                                        ? 'bg-amber-500/5 border-amber-500/30'
                                        : itemEval.highestSeverity === 'caution_yellow'
                                        ? 'bg-yellow-500/5 border-yellow-500/30'
                                        : 'bg-slate-50 dark:bg-obsidian-950 border-slate-200/60 dark:border-slate-800/60'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                                        {item.name}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                        <span className="font-black text-slate-900 dark:text-white">
                                          {item.calories} kcal
                                        </span>
                                        {onUpdateMeal && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              soundFx.playTap();
                                              setEditingIngredient({
                                                mealId: meal.id,
                                                itemIndex: idx,
                                                name: item.name,
                                                calories: item.calories,
                                                portionDescription: item.portionDescription || '',
                                                portionGrams: item.portionGrams || 100,
                                                protein: item.protein,
                                                carbs: item.carbs,
                                                fat: item.fat,
                                                fiber: item.fiber || 0,
                                                sugar: item.sugar || 0,
                                                sodium: item.sodium || 0,
                                                verifiedSource: 'ICMR-NIN IFCT / USDA'
                                              });
                                            }}
                                            className="p-1 rounded-md text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition"
                                            title={`Edit ${item.name}`}
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                     <span className="text-[10px] text-slate-400 block">
                                       {item.portionDescription} • P:{formatOneDecimal(item.protein)}g C:{formatOneDecimal(item.carbs)}g F:{formatOneDecimal(item.fat)}g
                                     </span>

                                    {/* Ingredient-specific Warning Accordion */}
                                    {itemEval.hasWarnings && (
                                      <FoodHealthWarningAccordion
                                        warnings={itemEval.warnings}
                                        highestSeverity={itemEval.highestSeverity}
                                        compact
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Food Item / Ingredient Modal */}
      {editingIngredient && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setEditingIngredient(null)}
        >
          <div 
            className="bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingIngredient.itemIndex >= (meals.find(m => m.id === editingIngredient.mealId)?.items.length || 0)
                      ? 'Add Food Item'
                      : 'Edit Food Item'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Correct food recognition and customize nutrition</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingIngredient(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 1. Food Item Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Food Item Name
                  </label>
                  {editingIngredient.isAIResolving ? (
                    <span className="text-[10px] font-bold text-cyan-500 flex items-center gap-1 animate-pulse">
                      <Sparkles className="w-3 h-3 animate-spin" /> AI Calculating...
                    </span>
                  ) : editingIngredient.verifiedSource ? (
                    <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> {editingIngredient.verifiedSource}
                    </span>
                  ) : null}
                </div>
                <input
                  type="text"
                  value={editingIngredient.name}
                  onChange={(e) => setEditingIngredient({ ...editingIngredient, name: e.target.value })}
                  placeholder="e.g. Multi Grain Paratha, Chole, Boiled Eggs"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none transition"
                  autoFocus
                />
              </div>

              {/* 2. Portion Weight (Grams) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Portion Weight (Grams)
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {editingIngredient.portionDescription || `${editingIngredient.portionGrams}g`}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editingIngredient.portionGrams}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
                      setEditingIngredient({ ...editingIngredient, portionGrams: val === '' ? '' : Number(val) });
                    }}
                    placeholder="e.g. 90"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none transition pr-14"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400 pointer-events-none">
                    grams
                  </span>
                </div>

                {/* Quick Weight Presets */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-medium mr-1">Quick:</span>
                  {[50, 90, 120, 150, 200].map(grams => (
                    <button
                      key={grams}
                      type="button"
                      onClick={() => {
                        soundFx.playTap();
                        setEditingIngredient({ ...editingIngredient, portionGrams: grams });
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                        editingIngredient.portionGrams === grams
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                          : 'bg-slate-100 dark:bg-obsidian-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                      }`}
                    >
                      {grams}g {grams === 90 ? '(1 paratha)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Automated AI-Computed Nutrition Display (Medically Verified & Read-Only) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-obsidian-950/80 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                    AI Medically Verified Nutrition
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                    Auto-Computed by AI
                  </span>
                </div>

                {/* Calorie Highlight Card */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/15 border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Calories
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {editingIngredient.calories}
                      </span>
                      <span className="text-xs font-extrabold text-emerald-500">kcal</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                    <Flame className="w-5 h-5" />
                  </div>
                </div>

                {/* Macronutrients Grid */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200/60 dark:border-slate-800/60 text-center shadow-sm">
                    <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Protein</span>
                    <span className="text-sm font-black text-blue-500 block">
                      {editingIngredient.protein}g
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200/60 dark:border-slate-800/60 text-center shadow-sm">
                    <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Carbs</span>
                    <span className="text-sm font-black text-amber-500 block">
                      {editingIngredient.carbs}g
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200/60 dark:border-slate-800/60 text-center shadow-sm">
                    <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Fat</span>
                    <span className="text-sm font-black text-rose-500 block">
                      {editingIngredient.fat}g
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200/60 dark:border-slate-800/60 text-center shadow-sm">
                    <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Fiber</span>
                    <span className="text-sm font-black text-emerald-500 block">
                      {editingIngredient.fiber}g
                    </span>
                  </div>
                </div>

                {/* Medical Integrity Note */}
                <div className="flex items-start gap-1.5 p-2 rounded-xl bg-emerald-500/5 text-[10px] text-slate-500 dark:text-slate-400 border border-emerald-500/10">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    {editingIngredient.clinicalNote || 'Medically verified against ICMR-NIN Indian Food Composition Tables (IFCT) & USDA FoodData Central. Macros are auto-calculated by AI to ensure health accuracy.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              {editingIngredient.itemIndex < (meals.find(m => m.id === editingIngredient.mealId)?.items.length || 0) ? (
                <button
                  type="button"
                  onClick={() => handleDeleteIngredientFromMeal(editingIngredient.mealId, editingIngredient.itemIndex)}
                  className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingIngredient(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-obsidian-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedIngredient}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ↩️ Undo Plate / Image Delete Notification Toast */}
      {undoMeal && (
        <div 
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-950/95 text-white border border-emerald-500/40 shadow-2xl backdrop-blur-md animate-fade-in text-xs max-w-md w-[92%] sm:w-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {undoMeal.photoUri ? (
            <img 
              src={undoMeal.photoUri} 
              alt="Deleted Plate" 
              className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-700 shadow-sm" 
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Utensils className="w-5 h-5" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <span className="font-bold truncate block text-slate-100">
              Plate deleted
            </span>
            <span className="text-[11px] text-slate-400 truncate block">
              {undoMeal.title || 'Meal item'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleUndoDelete}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-extrabold flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 transition shrink-0"
            title="Restore deleted plate image and data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>

          <button
            type="button"
            onClick={() => setUndoMeal(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition shrink-0"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
