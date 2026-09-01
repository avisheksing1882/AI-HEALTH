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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [mealTitle, setMealTitle] = useState('Logged Meal');
  const [basket, setBasket] = useState<FoodItemNutrition[]>([]);

  // Custom Food Form state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState(150);
  const [customProtein, setCustomProtein] = useState(5);
  const [customCarbs, setCustomCarbs] = useState(20);
  const [customFat, setCustomFat] = useState(5);
  const [customGrams, setCustomGrams] = useState(100);

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

  const handleUpdateGrams = (index: number, newGrams: number) => {
    if (newGrams <= 0) return;
    const current = basket[index];
    const originalEntry = FOOD_DATABASE.find(f => f.name === current.name);
    
    if (originalEntry) {
      const updated = convertEntryToNutritionItem(originalEntry, newGrams);
      const newBasket = [...basket];
      newBasket[index] = updated;
      setBasket(newBasket);
    } else {
      const scale = newGrams / current.portionGrams;
      const updated: FoodItemNutrition = {
        ...current,
        portionGrams: newGrams,
        portionDescription: `${newGrams}g`,
        calories: Math.round(current.calories * scale),
        protein: Number((current.protein * scale).toFixed(1)),
        carbs: Number((current.carbs * scale).toFixed(1)),
        fat: Number((current.fat * scale).toFixed(1)),
      };
      const newBasket = [...basket];
      newBasket[index] = updated;
      setBasket(newBasket);
    }
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    soundFx.playTap();
    const customItem: FoodItemNutrition = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      portionGrams: Number(customGrams),
      portionDescription: `${customGrams}g custom`,
      calories: Number(customCalories),
      protein: Number(customProtein),
      carbs: Number(customCarbs),
      fat: Number(customFat),
      confidence: 1.0,
    };

    setBasket([...basket, customItem]);
    setCustomName('');
    setShowCustomForm(false);
  };

  const handleSaveMeal = () => {
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

    const finalTitle = basket.length === 1 
      ? basket[0].name 
      : `${basket[0].name} + ${basket.length - 1} more`;

    const mealLog: MealLog = {
      id: `meal-manual-${Date.now()}`,
      userId: profile.id,
      date: selectedDate,
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      mealType,
      title: mealTitle !== 'Logged Meal' ? mealTitle : finalTitle,
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
      <div className="bg-white dark:bg-obsidian-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        
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
                Search verified food database or enter custom recipe
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
          
          {/* Meal Type Selection */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Meal Type:</span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-obsidian-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(m => (
                <button
                  key={m}
                  onClick={() => { soundFx.playTap(); setMealType(m); }}
                  className={`px-3 py-1 rounded-lg capitalize transition ${
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
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-obsidian-950 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
            <button
              onClick={() => { soundFx.playTap(); setShowCustomForm(!showCustomForm); }}
              className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 whitespace-nowrap font-semibold ml-auto flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> + Custom Item
            </button>
          </div>

          {/* Custom Food Form */}
          {showCustomForm && (
            <form onSubmit={handleAddCustomItem} className="p-4 rounded-2xl bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/20 space-y-3">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Add Custom Dish</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] text-slate-500 mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Homemade Smoothie"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Calories (kcal)</label>
                  <input
                    type="number"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Protein (g)</label>
                  <input
                    type="number"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Fats (g)</label>
                  <input
                    type="number"
                    value={customFat}
                    onChange={(e) => setCustomFat(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Weight (g)</label>
                  <input
                    type="number"
                    value={customGrams}
                    onChange={(e) => setCustomGrams(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition"
              >
                Add To Meal
              </button>
            </form>
          )}

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
                    {entry.portionDescription} &bull; {Math.round(entry.caloriesPer100g * (entry.defaultPortionGrams / 100))} kcal &bull; P: {(entry.proteinPer100g * (entry.defaultPortionGrams / 100)).toFixed(1)}g
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

          {/* Active Meal Basket */}
          {basket.length > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100 mb-2">
                <span>Meal Plate Items ({basket.length})</span>
                <span className="text-emerald-500 font-extrabold">{totalBasketKcal} kcal total</span>
              </div>

              <div className="space-y-2">
                {basket.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs"
                  >
                    <div className="flex-1">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{item.name}</span>
                      <span className="text-[10px] text-slate-500">{item.calories} kcal &bull; P:{item.protein}g C:{item.carbs}g F:{item.fat}g</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="5"
                        max="800"
                        value={item.portionGrams}
                        onChange={(e) => handleUpdateGrams(index, Number(e.target.value))}
                        className="w-16 px-2 py-1 rounded bg-white dark:bg-obsidian-900 border border-slate-300 dark:border-slate-700 text-center text-xs font-bold"
                      />
                      <span className="text-[10px] text-slate-500">g</span>
                      <button
                        onClick={() => handleRemoveFromBasket(index)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-obsidian-950 flex items-center justify-between">
          <button
            onClick={() => { soundFx.playTap(); onClose(); }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-obsidian-800 transition"
          >
            Cancel
          </button>

          <button
            onClick={handleSaveMeal}
            disabled={basket.length === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition ${
              basket.length > 0
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-slate-200 dark:bg-obsidian-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Save Meal ({totalBasketKcal} kcal)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
