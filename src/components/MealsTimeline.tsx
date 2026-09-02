import React, { useState } from 'react';
import { Utensils, Plus, Trash2, ChevronDown, ChevronUp, Sparkles, Camera, Layers, Pencil, Check, X } from 'lucide-react';
import { MealLog, MealType, HealthCondition, FoodItemNutrition } from '../types';
import { soundFx, triggerHaptic } from '../services/soundEffects';
import { evaluateFoodForHealthConditions } from '../services/healthConditionFoodEvaluator';
import { FoodHealthWarningAccordion } from './FoodHealthWarningAccordion';

interface EditingIngredientState {
  mealId: string;
  itemIndex: number;
  name: string;
  calories: number | '';
  portionDescription: string;
  portionGrams: number | '';
  protein: number | '';
  carbs: number | '';
  fat: number | '';
  fiber: number | '';
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

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = !selectedDate || selectedDate === todayStr;

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
    onDeleteMeal(id);
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
      calories: editingIngredient.calories === '' ? (oldItem ? oldItem.calories : 0) : Number(editingIngredient.calories),
      portionDescription: editingIngredient.portionDescription.trim() || (oldItem ? oldItem.portionDescription : '1 serving'),
      portionGrams: editingIngredient.portionGrams === '' ? (oldItem ? oldItem.portionGrams : 100) : Number(editingIngredient.portionGrams),
      protein: editingIngredient.protein === '' ? (oldItem ? oldItem.protein : 0) : Number(editingIngredient.protein),
      carbs: editingIngredient.carbs === '' ? (oldItem ? oldItem.carbs : 0) : Number(editingIngredient.carbs),
      fat: editingIngredient.fat === '' ? (oldItem ? oldItem.fat : 0) : Number(editingIngredient.fat),
      fiber: editingIngredient.fiber === '' ? (oldItem?.fiber || 0) : Number(editingIngredient.fiber),
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
    let updatedTitle = targetMeal.title;
    if (oldItem && oldItem.name && updatedItem.name !== oldItem.name && targetMeal.title.toLowerCase().includes(oldItem.name.toLowerCase())) {
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
          const sectionMeals = meals.filter(m => m.mealType === section.type);
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

                    return (
                      <div
                        key={meal.id}
                        onClick={() => toggleExpand(meal.id)}
                        className={`bg-white dark:bg-obsidian-900 rounded-2xl p-3.5 border ${cardBorder} cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition shadow-sm`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {meal.photoUri ? (
                              <img
                                src={meal.photoUri}
                                alt={meal.title}
                                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                <Utensils className="w-5 h-5" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {editingMealTitle?.id === meal.id ? (
                                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="text"
                                      value={editingMealTitle.title}
                                      onChange={(e) => setEditingMealTitle({ ...editingMealTitle, title: e.target.value })}
                                      className="text-xs font-bold text-slate-800 dark:text-slate-100 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-obsidian-950 border border-emerald-500 focus:outline-none"
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
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingMealTitle(null)}
                                      className="p-1 rounded text-slate-400 hover:text-slate-600 transition"
                                      title="Cancel"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                      {meal.title}
                                    </span>
                                    {onUpdateMeal && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          soundFx.playTap();
                                          setEditingMealTitle({ id: meal.id, title: meal.title });
                                        }}
                                        className="p-0.5 rounded text-slate-400 hover:text-emerald-500 transition"
                                        title="Rename meal title"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                    )}
                                  </>
                                )}
                                {meal.aiAnalyzed && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-500 font-bold border border-cyan-500/20 flex items-center gap-0.5">
                                    <Sparkles className="w-2.5 h-2.5" /> AI
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                                <span>{meal.time}</span>
                                <span>•</span>
                                <span>P: {meal.totalProtein}g</span>
                                <span>C: {meal.totalCarbs}g</span>
                                <span>F: {meal.totalFat}g</span>
                                {meal.totalFiber ? <span>• Fib: {meal.totalFiber}g</span> : null}
                              </div>

                              {/* One-Click Fix: Move morning scan to Breakfast */}
                              {meal.mealType !== 'breakfast' && (meal.time < '11:30' || meal.time.startsWith('10:')) && onUpdateMeal && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    soundFx.playSuccessChime();
                                    triggerHaptic();
                                    onUpdateMeal({ ...meal, mealType: 'breakfast' });
                                  }}
                                  className="mt-1.5 px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 font-bold text-[10px] border border-amber-500/30 inline-flex items-center gap-1 transition"
                                  title="Logged in morning. Click to move to Breakfast"
                                >
                                  <span>🍳 Move to Breakfast</span>
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                              {meal.totalCalories} <span className="text-[10px] font-normal text-slate-400">kcal</span>
                            </span>

                            {/* Category Switcher */}
                            {onUpdateMeal && (
                              <select
                                value={meal.mealType}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  soundFx.playSuccessChime();
                                  triggerHaptic();
                                  onUpdateMeal({ ...meal, mealType: e.target.value as MealType });
                                }}
                                className="text-[10px] font-bold bg-slate-100 dark:bg-obsidian-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer hover:border-emerald-500 transition capitalize"
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
                              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                              title="Delete meal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
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
                                      calories: '',
                                      portionDescription: '',
                                      portionGrams: '',
                                      protein: '',
                                      carbs: '',
                                      fat: '',
                                      fiber: ''
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
                                                portionGrams: item.portionGrams || '',
                                                protein: item.protein,
                                                carbs: item.carbs,
                                                fat: item.fat,
                                                fiber: item.fiber || ''
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
                                      {item.portionDescription} • P:{item.protein}g C:{item.carbs}g F:{item.fat}g
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

            <div className="space-y-3.5">
              {/* Food Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Food Name
                </label>
                <input
                  type="text"
                  value={editingIngredient.name}
                  onChange={(e) => setEditingIngredient({ ...editingIngredient, name: e.target.value })}
                  placeholder="e.g. Multi Grain Paratha"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Portion Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Portion Description
                </label>
                <input
                  type="text"
                  value={editingIngredient.portionDescription}
                  onChange={(e) => setEditingIngredient({ ...editingIngredient, portionDescription: e.target.value })}
                  placeholder="e.g. 1.5 medium parathas (90g)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Calories and Grams */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Calories (kcal)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editingIngredient.calories}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
                      setEditingIngredient({ ...editingIngredient, calories: val === '' ? '' : Number(val) });
                    }}
                    placeholder="e.g. 260"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Weight (grams)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editingIngredient.portionGrams}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
                      setEditingIngredient({ ...editingIngredient, portionGrams: val === '' ? '' : Number(val) });
                    }}
                    placeholder="e.g. 90"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Macronutrients Grid */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Protein (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingIngredient.protein}
                    onChange={(e) => setEditingIngredient({ ...editingIngredient, protein: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingIngredient.carbs}
                    onChange={(e) => setEditingIngredient({ ...editingIngredient, carbs: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Fat (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingIngredient.fat}
                    onChange={(e) => setEditingIngredient({ ...editingIngredient, fat: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Fiber (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingIngredient.fiber}
                    onChange={(e) => setEditingIngredient({ ...editingIngredient, fiber: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                  />
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

    </div>
  );
};
