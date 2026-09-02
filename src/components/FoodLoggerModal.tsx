import React, { useState } from 'react';
import { X, Search, Plus, Trash2, Check, Utensils } from 'lucide-react';
import { FoodItemNutrition, MealLog, MealType, UserProfile } from '../types';
import { FOOD_DATABASE, FoodCatalogEntry, lookupFoodByQuery, convertEntryToNutritionItem } from '../services/foodCatalog';
import { soundFx, triggerHaptic } from '../services/soundEffects';

interface FoodLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMealSaved: (meal: MealLog) => void;
  selectedDate: string;
  profile: UserProfile;
}

export const FoodLoggerModal: React.FC<FoodLoggerModalProps> = ({
  isOpen,
  onClose,
  onMealSaved,
  selectedDate,
  profile,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'custom'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [mealTitle, setMealTitle] = useState('');
  const [basket, setBasket] = useState<FoodItemNutrition[]>([]);

  // Direct Custom Meal Form state
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState<string>('350');
  const [customProtein, setCustomProtein] = useState<string>('15');
  const [customCarbs, setCustomCarbs] = useState<string>('45');
  const [customFat, setCustomFat] = useState<string>('10');
  const [customFiber, setCustomFiber] = useState<string>('4');
  const [customGrams, setCustomGrams] = useState<string>('200');

  if (!isOpen) return null;

  const searchResults = lookupFoodByQuery(searchQuery).filter(item => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  const handleAddItemToBasket = (entry: FoodCatalogEntry) => {
    soundFx.playTap();
    triggerHaptic();
    const item = convertEntryToNutritionItem(entry);
    setBasket([...basket, item]);
  };

  const handleRemoveFromBasket = (index: number) => {
    soundFx.playTap();
    setBasket(basket.filter((_, idx) => idx !== index));
  };

  const handleUpdateItemProperty = (index: number, field: keyof FoodItemNutrition, value: number) => {
    const updated = [...basket];
    const current = { ...updated[index] };
    if (field === 'portionGrams') {
      const originalEntry = FOOD_DATABASE.find(f => f.name === current.name);
      if (originalEntry && value > 0) {
        const recalculated = convertEntryToNutritionItem(originalEntry, value);
        updated[index] = recalculated;
        setBasket(updated);
        return;
      }
    }
    // Direct field override
    (current as any)[field] = value;
    updated[index] = current;
    setBasket(updated);
  };

  // Direct 1-Tap Save Custom Meal
  const handleSaveDirectCustomMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    soundFx.playRingCelebration();
    triggerHaptic();

    const now = new Date();
    const kcal = Math.max(0, parseInt(customCalories, 10) || 0);
    const p = Math.max(0, parseFloat(customProtein) || 0);
    const c = Math.max(0, parseFloat(customCarbs) || 0);
    const f = Math.max(0, parseFloat(customFat) || 0);
    const fib = Math.max(0, parseFloat(customFiber) || 0);
    const g = Math.max(10, parseInt(customGrams, 10) || 100);

    const customItem: FoodItemNutrition = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      portionGrams: g,
      portionDescription: `${g}g portion`,
      calories: kcal,
      protein: p,
      carbs: c,
      fat: f,
      fiber: fib,
      confidence: 1.0,
    };

    const mealLog: MealLog = {
      id: `meal-custom-${Date.now()}`,
      userId: profile.id,
      date: selectedDate,
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      mealType,
      title: customName.trim(),
      items: [customItem],
      totalCalories: kcal,
      totalProtein: p,
      totalCarbs: c,
      totalFat: f,
      totalFiber: fib,
      totalSugar: 0,
      totalSodium: 0,
      aiAnalyzed: false,
      confidenceScore: 1.0,
      disclaimer: 'Custom user-entered nutrition.',
      userModified: true,
      createdAt: now.toISOString(),
    };

    onMealSaved(mealLog);
    onClose();
  };

  const handleAddCustomItemToBasket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    soundFx.playTap();
    const kcal = Math.max(0, parseInt(customCalories, 10) || 0);
    const p = Math.max(0, parseFloat(customProtein) || 0);
    const c = Math.max(0, parseFloat(customCarbs) || 0);
    const f = Math.max(0, parseFloat(customFat) || 0);
    const fib = Math.max(0, parseFloat(customFiber) || 0);
    const g = Math.max(10, parseInt(customGrams, 10) || 100);

    const customItem: FoodItemNutrition = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      portionGrams: g,
      portionDescription: `${g}g`,
      calories: kcal,
      protein: p,
      carbs: c,
      fat: f,
      fiber: fib,
      confidence: 1.0,
    };

    setBasket([...basket, customItem]);
    setCustomName('');
    setActiveTab('search');
  };

  const handleSaveBasketMeal = () => {
    if (basket.length === 0) return;

    soundFx.playRingCelebration();
    triggerHaptic();

    const now = new Date();
    const totalCalories = basket.reduce((acc, i) => acc + i.calories, 0);
    const totalProtein = Number(basket.reduce((acc, i) => acc + i.protein, 0).toFixed(1));
    const totalCarbs = Number(basket.reduce((acc, i) => acc + i.carbs, 0).toFixed(1));
    const totalFat = Number(basket.reduce((acc, i) => acc + i.fat, 0).toFixed(1));
    const totalFiber = Number(basket.reduce((acc, i) => acc + (i.fiber || 0), 0).toFixed(1));
    const totalSugar = Number(basket.reduce((acc, i) => acc + (i.sugar || 0), 0).toFixed(1));
    const totalSodium = Math.round(basket.reduce((acc, i) => acc + (i.sodium || 0), 0));

    const finalTitle = mealTitle.trim() || (basket.length === 1 
      ? basket[0].name 
      : `${basket[0].name} + ${basket.length - 1} more`);

    const mealLog: MealLog = {
      id: `meal-manual-${Date.now()}`,
      userId: profile.id,
      date: selectedDate,
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      mealType,
      title: finalTitle,
      items: basket,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      totalFiber,
      totalSugar,
      totalSodium,
      aiAnalyzed: false,
      confidenceScore: 1.0,
      disclaimer: 'Manual verified entry.',
      userModified: true,
      createdAt: now.toISOString(),
    };

    onMealSaved(mealLog);
    onClose();
  };

  const totalBasketKcal = basket.reduce((s, i) => s + i.calories, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-obsidian-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-obsidian-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Log Food & Nutrition
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Search verified food database or enter direct custom values
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Mode Switcher Tabs & Meal Type Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100 dark:border-slate-800/80">
            {/* 2 Top Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-obsidian-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              <button
                onClick={() => { soundFx.playTap(); setActiveTab('search'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'search'
                    ? 'bg-white dark:bg-obsidian-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search Catalog</span>
              </button>
              <button
                onClick={() => { soundFx.playTap(); setActiveTab('custom'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'custom'
                    ? 'bg-white dark:bg-obsidian-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Custom Value Entry</span>
              </button>
            </div>

            {/* Meal Type Picker */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-obsidian-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(m => (
                <button
                  key={m}
                  onClick={() => { soundFx.playTap(); setMealType(m); }}
                  className={`px-2.5 py-1 rounded-lg capitalize transition ${
                    mealType === m
                      ? 'bg-emerald-500 text-white font-bold shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: Search Database Mode */}
          {activeTab === 'search' && (
            <div className="space-y-3">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Indian & Global dishes (e.g. Dal, Roti, Biryani, Oats, Eggs)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                {['all', 'grain', 'protein', 'vegetable', 'fruit', 'dairy', 'snack'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => { soundFx.playTap(); setSelectedCategory(cat); }}
                    className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap font-medium transition ${
                      selectedCategory === cat
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold'
                        : 'bg-slate-100 dark:bg-obsidian-950 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Database Items List */}
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {searchResults.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-obsidian-950/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/40 transition"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                        {entry.name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {entry.portionDescription} • {Math.round(entry.caloriesPer100g * (entry.defaultPortionGrams / 100))} kcal • P: {(entry.proteinPer100g * (entry.defaultPortionGrams / 100)).toFixed(1)}g
                      </span>
                    </div>

                    <button
                      onClick={() => handleAddItemToBasket(entry)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-500 hover:text-white transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Direct Custom Value Entry Form */}
          {activeTab === 'custom' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Direct Custom Meal & Calorie Input
                </span>
                <span className="text-[10px] text-slate-400">100% custom values</span>
              </div>

              {/* Meal Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Food / Meal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Homemade Paneer Bhurji & Paratha, Fruit Smoothie, Chai..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Nutrition Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Calories (kcal) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    placeholder="350"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(e.target.value.replace(/^0+(?=\d)/, ''))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="15"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(e.target.value.replace(/^0+(?=\d)/, ''))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="45"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(e.target.value.replace(/^0+(?=\d)/, ''))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Fats (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="10"
                    value={customFat}
                    onChange={(e) => setCustomFat(e.target.value.replace(/^0+(?=\d)/, ''))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Fiber (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="4"
                    value={customFiber}
                    onChange={(e) => setCustomFiber(e.target.value.replace(/^0+(?=\d)/, ''))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Weight (g)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="200"
                    value={customGrams}
                    onChange={(e) => setCustomGrams(e.target.value.replace(/^0+(?=\d)/, ''))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs"
                  />
                </div>
              </div>

              {/* Quick Calorie Presets */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-400">Quick Calories:</span>
                {[150, 250, 350, 500, 750].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { soundFx.playTap(); setCustomCalories(String(c)); }}
                    className="px-2 py-0.5 rounded-lg bg-slate-200/80 dark:bg-obsidian-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-500 hover:text-white transition"
                  >
                    {c} kcal
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveDirectCustomMeal}
                  disabled={!customName.trim()}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 ${
                    customName.trim()
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-emerald-500/25'
                      : 'bg-slate-200 dark:bg-obsidian-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>Log This Meal Now ({customCalories || 0} kcal)</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddCustomItemToBasket}
                  disabled={!customName.trim()}
                  className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition"
                  title="Add to multi-item plate"
                >
                  + Add to Plate
                </button>
              </div>
            </div>
          )}

          {/* Active Meal Basket (Editable Items) */}
          {basket.length > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">
                <span>Items in this Meal ({basket.length})</span>
                <span className="text-emerald-500 font-extrabold">{totalBasketKcal} kcal total</span>
              </div>

              <div className="space-y-2">
                {basket.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                      <button
                        onClick={() => handleRemoveFromBasket(index)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Editable fields for this item */}
                    <div className="grid grid-cols-4 gap-2 text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Calories</span>
                        <input
                          type="number"
                          value={item.calories}
                          onChange={(e) => {
                            const val = e.target.value.replace(/^0+(?=\d)/, '');
                            handleUpdateItemProperty(index, 'calories', val === '' ? 0 : Number(val));
                          }}
                          className="w-full px-2 py-1 rounded-lg bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700 text-center font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Portion (g)</span>
                        <input
                          type="number"
                          value={item.portionGrams}
                          onChange={(e) => {
                            const val = e.target.value.replace(/^0+(?=\d)/, '');
                            handleUpdateItemProperty(index, 'portionGrams', val === '' ? 0 : Number(val));
                          }}
                          className="w-full px-2 py-1 rounded-lg bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700 text-center font-semibold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Protein (g)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={item.protein}
                          onChange={(e) => {
                            const val = e.target.value.replace(/^0+(?=\d)/, '');
                            handleUpdateItemProperty(index, 'protein', val === '' ? 0 : Number(val));
                          }}
                          className="w-full px-2 py-1 rounded-lg bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700 text-center font-semibold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Carbs (g)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={item.carbs}
                          onChange={(e) => {
                            const val = e.target.value.replace(/^0+(?=\d)/, '');
                            handleUpdateItemProperty(index, 'carbs', val === '' ? 0 : Number(val));
                          }}
                          className="w-full px-2 py-1 rounded-lg bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700 text-center font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer (Only for Basket Mode) */}
        {basket.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-obsidian-950 flex items-center justify-between">
            <button
              onClick={() => { soundFx.playTap(); onClose(); }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-obsidian-800 transition"
            >
              Cancel
            </button>

            <button
              onClick={handleSaveBasketMeal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 transition"
            >
              <Check className="w-4 h-4" />
              <span>Save Plate Meal ({totalBasketKcal} kcal)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
