import { FoodItemNutrition, HealthCondition } from '../types';

export type HealthSeverity = 'severe_red' | 'warning_orange' | 'caution_yellow' | 'safe_green';

export interface FoodHealthWarning {
  condition: HealthCondition;
  conditionName: string;
  conditionEmoji: string;
  severity: 'severe_red' | 'warning_orange' | 'caution_yellow';
  severityLabel: string;
  title: string;
  reason: string;
  clinicalExplanation: string;
  recommendedSwap: string;
}

export interface FoodHealthEvaluation {
  highestSeverity: HealthSeverity;
  warnings: FoodHealthWarning[];
  hasWarnings: boolean;
}

const CONDITION_META: Record<HealthCondition, { name: string; emoji: string }> = {
  thyroid: { name: 'Thyroid Care', emoji: '🦋' },
  pcos_pcod: { name: 'PCOS / PCOD', emoji: '🌸' },
  knee_pain: { name: 'Knee Joint Care', emoji: '🦵' },
  back_pain: { name: 'Spine & Back Care', emoji: '🦴' },
  diabetes_type2: { name: 'Blood Glucose', emoji: '🩸' },
  hypertension: { name: 'Blood Pressure', emoji: '🫀' },
  gerd_acidity: { name: 'Acid Reflux / GERD', emoji: '🍋' },
  fatty_liver: { name: 'Liver Health', emoji: '🥑' },
  uric_acid: { name: 'Uric Acid / Gout', emoji: '🌿' },
  none: { name: 'General Health', emoji: '✨' },
};

/**
 * Clinically evaluates a food item or complete meal against active user health conditions.
 */
export function evaluateFoodForHealthConditions(
  item: { name: string; calories: number; carbs?: number; sugar?: number; sodium?: number; fat?: number; protein?: number },
  userConditions: HealthCondition[] = []
): FoodHealthEvaluation {
  const activeConditions = userConditions.filter(c => c !== 'none');
  if (activeConditions.length === 0) {
    return { highestSeverity: 'safe_green', warnings: [], hasWarnings: false };
  }

  const warnings: FoodHealthWarning[] = [];
  const nameLower = (item.name || '').toLowerCase();
  const sugar = item.sugar || 0;
  const sodium = item.sodium || 0;
  const carbs = item.carbs || 0;
  const fat = item.fat || 0;

  for (const cond of activeConditions) {
    const meta = CONDITION_META[cond] || { name: cond, emoji: '⚠️' };

    // 1. 🦋 THYROID EVALUATION
    if (cond === 'thyroid') {
      // Raw goitrogens
      if (
        nameLower.includes('raw cabbage') ||
        nameLower.includes('raw cauliflower') ||
        nameLower.includes('raw broccoli') ||
        nameLower.includes('raw kale') ||
        nameLower.includes('raw radish')
      ) {
        warnings.push({
          condition: 'thyroid',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'severe_red',
          severityLabel: 'Contraindicated (Raw Goitrogens)',
          title: 'Suppresses Thyroid Hormone Synthesis',
          reason: 'Raw cruciferous vegetables contain active glucosinolates and goitrogens.',
          clinicalExplanation: 'Active goitrogens inhibit thyroidal iodine uptake and block T4 to T3 hormone conversion, aggravating hypothyroidism symptoms.',
          recommendedSwap: 'Cook, steam, or sauté cruciferous veggies thoroughly to deactivate goitrogenic compounds by >90%.'
        });
      } else if (nameLower.includes('soy protein') || nameLower.includes('soy isolate') || nameLower.includes('unfermented soy')) {
        warnings.push({
          condition: 'thyroid',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'severe_red',
          severityLabel: 'High Thyroid Interference',
          title: 'Isoflavone Interference with Thyroid Function',
          reason: 'Concentrated unfermented soy isoflavones interfere with thyroid peroxidase enzyme activity.',
          clinicalExplanation: 'May block thyroid medication absorption and reduce active metabolic hormone circulation.',
          recommendedSwap: 'Choose paneer, Greek yogurt, eggs, lentils, or fermented tempeh instead.'
        });
      } else if (sugar > 25) {
        warnings.push({
          condition: 'thyroid',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'warning_orange',
          severityLabel: 'Metabolic & Inflammatory Load',
          title: 'Slows Down Sluggish Thyroid Metabolism',
          reason: `Contains ${sugar}g high simple sugars on a reduced metabolic BMR.`,
          clinicalExplanation: 'Hypothyroidism reduces baseline metabolic turnover. High sugar intake quickly triggers visceral fat accumulation and systemic fatigue.',
          recommendedSwap: 'Substitute with fresh berries or a handful of selenium-rich Brazil nuts and pumpkin seeds.'
        });
      }
    }

    // 2. 🌸 PCOS / PCOD EVALUATION
    if (cond === 'pcos_pcod') {
      if (
        sugar > 20 ||
        nameLower.includes('soda') ||
        nameLower.includes('jalebi') ||
        nameLower.includes('gulab jamun') ||
        nameLower.includes('pastry') ||
        nameLower.includes('candy') ||
        nameLower.includes('sweetened')
      ) {
        warnings.push({
          condition: 'pcos_pcod',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'severe_red',
          severityLabel: 'Severe Insulin Spike Trigger',
          title: 'Triggers Ovarian Androgen Surge & Cyst Flare-up',
          reason: `High glycemic simple sugar (${sugar}g) spikes circulating insulin levels.`,
          clinicalExplanation: 'In PCOS, elevated insulin acts directly on the theca cells of ovaries to overproduce testosterone, causing hormonal acne, hirsutism, and ovulation disruption.',
          recommendedSwap: 'Opt for low-glycemic fruits (apple, berries, guava) paired with almond butter or Greek yogurt.'
        });
      } else if (
        nameLower.includes('white bread') ||
        nameLower.includes('maida') ||
        nameLower.includes('bhatura') ||
        nameLower.includes('refined pasta') ||
        nameLower.includes('french fries')
      ) {
        warnings.push({
          condition: 'pcos_pcod',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'warning_orange',
          severityLabel: 'Refined Carb & Glycemic Load',
          title: 'Rapid Glucose Elevation Without Fiber Buffer',
          reason: 'Refined flours lack complex fiber and cause rapid glycemic surges.',
          clinicalExplanation: 'Leads to postprandial reactive hypoglycemia, intense sugar cravings, and systemic low-grade inflammation.',
          recommendedSwap: 'Swap with 100% whole wheat roti, oats, quinoa, or millets (jowar/bajra).'
        });
      } else if (carbs > 45 && (item.protein || 0) < 6) {
        warnings.push({
          condition: 'pcos_pcod',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'caution_yellow',
          severityLabel: 'Unbalanced Macro Ratio',
          title: 'High Carbs Without Sufficient Protein Pairing',
          reason: 'Meal is carb-heavy with minimal protein to buffer digestion.',
          clinicalExplanation: 'Unpaired carbs digest rapidly. Combining carbs with protein blunts the insulin surge.',
          recommendedSwap: 'Add 2 boiled eggs, a cup of dal, or 50g paneer/tofu to balance the plate.'
        });
      }
    }

    // 3. 🦵 KNEE PAIN / JOINT SENSITIVITY EVALUATION
    if (cond === 'knee_pain') {
      if (
        nameLower.includes('deep fried') ||
        nameLower.includes('pakoda') ||
        nameLower.includes('samosa') ||
        nameLower.includes('french fries') ||
        nameLower.includes('crispy fried') ||
        (fat > 25 && carbs > 30)
      ) {
        warnings.push({
          condition: 'knee_pain',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'severe_red',
          severityLabel: 'Pro-Inflammatory Cytokine Trigger',
          title: 'Accelerates Knee Cartilage Breakdown & Swelling',
          reason: 'Deep-fried foods are rich in oxidized lipids and advanced glycation end-products (AGEs).',
          clinicalExplanation: 'AGEs trigger inflammatory cytokines (TNF-alpha & IL-6) that attack synovial fluid in the knee joint capsule, causing severe post-meal stiffness and joint ache.',
          recommendedSwap: 'Switch to air-fried or roasted alternatives with turmeric (curcumin) and black pepper for anti-inflammatory joint relief.'
        });
      } else if (sodium > 750) {
        warnings.push({
          condition: 'knee_pain',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'warning_orange',
          severityLabel: 'Fluid Retention & Joint Pressure',
          title: 'Causes Synovial Fluid Retention in Knee Joints',
          reason: `High sodium content (${sodium}mg) promotes peripheral water retention.`,
          clinicalExplanation: 'Excess sodium increases hydrostatic pressure within knee joint capsules, making movement and walking painful.',
          recommendedSwap: 'Drink 2 extra glasses of water to help flush excess sodium, and choose low-salt home preparations.'
        });
      } else if (sugar > 25) {
        warnings.push({
          condition: 'knee_pain',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'caution_yellow',
          severityLabel: 'Systemic Inflammation Advisory',
          title: 'Sugar-Induced Inflammatory Response',
          reason: 'Elevated sugar intake triggers mild joint inflammatory pathways.',
          clinicalExplanation: 'Can exacerbate tendon sensitivity and patellar inflammation after walking.',
          recommendedSwap: 'Choose whole fresh fruits rich in vitamin C to support collagen synthesis.'
        });
      }
    }

    // 4. 🦴 LOWER BACK / SPINAL STRAIN EVALUATION
    if (cond === 'back_pain') {
      if (nameLower.includes('deep fried') || nameLower.includes('trans fat') || fat > 30) {
        warnings.push({
          condition: 'back_pain',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'severe_red',
          severityLabel: 'Pro-Inflammatory Disc Trigger',
          title: 'Exacerbates Lumbar & Spinal Inflammation',
          reason: 'High trans-fat and saturated lipids elevate systemic inflammation around spinal discs.',
          clinicalExplanation: 'Inflammatory cytokines heighten pain sensitivity in lower back nerve endings and lumbar facet joints.',
          recommendedSwap: 'Incorporate omega-3 rich walnuts, chia seeds, or grilled fish to soothe spinal inflammation.'
        });
      } else if (sodium > 800) {
        warnings.push({
          condition: 'back_pain',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'warning_orange',
          severityLabel: 'Sodium Fluid Retention',
          title: 'Promotes Tissue Swelling & Muscle Spasms',
          reason: `High sodium (${sodium}mg) contributes to lower back muscle tightness.`,
          clinicalExplanation: 'Electrolyte imbalance can lead to lumbar muscle cramping.',
          recommendedSwap: 'Pair with potassium-rich coconut water or a banana.'
        });
      }
    }

    // 5. 🩸 TYPE 2 DIABETES EVALUATION
    if (cond === 'diabetes_type2') {
      if (sugar > 18 || nameLower.includes('soda') || nameLower.includes('sweet') || nameLower.includes('dessert')) {
        warnings.push({
          condition: 'diabetes_type2',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'severe_red',
          severityLabel: 'Severe Glycemic Spike',
          title: 'Direct Blood Sugar Surge Risk',
          reason: `Contains ${sugar}g fast simple sugars with rapid blood glucose absorption.`,
          clinicalExplanation: 'Causes acute postprandial hyperglycemia and places heavy demands on pancreatic beta-cells.',
          recommendedSwap: 'Choose whole fiber fruits (apple, berries) or cinnamon-spiced roasted nuts.'
        });
      } else if (nameLower.includes('white bread') || (carbs > 50 && (item.protein || 0) < 6)) {
        warnings.push({
          condition: 'diabetes_type2',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'warning_orange',
          severityLabel: 'High Glycemic Load',
          title: 'Unbuffered Starch Digestion',
          reason: 'High carb portion without sufficient soluble fiber or protein.',
          clinicalExplanation: 'Will result in sustained glucose elevation for 2-3 hours post-meal.',
          recommendedSwap: 'Eat a fresh cucumber/salad bowl first, followed by protein, then carbs.'
        });
      }
    }

    // 6. 🫀 HYPERTENSION (HIGH BP) EVALUATION
    if (cond === 'hypertension') {
      if (sodium > 750 || nameLower.includes('pickle') || nameLower.includes('achar') || nameLower.includes('instant ramen') || nameLower.includes('papads')) {
        warnings.push({
          condition: 'hypertension',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'severe_red',
          severityLabel: 'Critical Sodium Warning',
          title: 'Elevates Arterial Tension & Blood Pressure',
          reason: `Contains ${sodium}mg sodium (>35% of total recommended daily allowance in one dish).`,
          clinicalExplanation: 'High sodium leads to acute intravascular volume expansion and vasoconstriction, increasing blood pressure.',
          recommendedSwap: 'Limit pickle/achar to a pea-sized portion and use lemon juice or herbs for seasoning.'
        });
      } else if (sodium > 450) {
        warnings.push({
          condition: 'hypertension',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'warning_orange',
          severityLabel: 'Moderate Sodium Warning',
          title: 'Monitor Sodium Threshold',
          reason: `Sodium content (${sodium}mg) is elevated for a single item.`,
          clinicalExplanation: 'DASH guidelines recommend keeping individual items under 350mg sodium.',
          recommendedSwap: 'Pair with high-potassium foods (spinach, banana) to balance vascular pressure.'
        });
      }
    }

    // 7. 🍋 ACID REFLUX / GERD EVALUATION
    if (cond === 'gerd_acidity') {
      if (
        nameLower.includes('deep fried') ||
        nameLower.includes('hot spicy') ||
        nameLower.includes('extra spicy') ||
        nameLower.includes('mirchi') ||
        nameLower.includes('green chilli curry') ||
        (fat > 25 && nameLower.includes('curry'))
      ) {
        warnings.push({
          condition: 'gerd_acidity',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'severe_red',
          severityLabel: 'Severe Acid Trigger',
          title: 'Relaxes Lower Esophageal Sphincter (LES)',
          reason: 'High fat and heavy capsaicin chillies delay gastric emptying and trigger severe acid reflux.',
          clinicalExplanation: 'Causes stomach acid to backflow into the esophagus, producing severe heartburn and epigastric discomfort.',
          recommendedSwap: 'Opt for mild homestyle steamed or mildly spiced preparations. Avoid lying down for 2 hours after eating.'
        });
      } else if (nameLower.includes('coffee') || nameLower.includes('citrus') || nameLower.includes('lemon shot') || nameLower.includes('vinegar')) {
        warnings.push({
          condition: 'gerd_acidity',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'warning_orange',
          severityLabel: 'Gastric Acid Stimulant',
          title: 'Stimulates Hydrochloric Acid Secretion',
          reason: 'Directly irritates gastric mucosal lining on an empty stomach.',
          clinicalExplanation: 'Can trigger acute gastritis or burning sensations.',
          recommendedSwap: 'Drink cold milk, tender coconut water, or consume after a solid whole-grain meal.'
        });
      }
    }

    // 8. 🥑 FATTY LIVER (NAFLD) EVALUATION
    if (cond === 'fatty_liver') {
      if (sugar > 22 || nameLower.includes('high fructose') || nameLower.includes('corn syrup') || nameLower.includes('soda')) {
        warnings.push({
          condition: 'fatty_liver',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'severe_red',
          severityLabel: 'Hepatic Lipogenesis Risk',
          title: 'Direct Fructose Conversion to Liver Fat',
          reason: 'High liquid fructose is processed exclusively in the liver into triglycerides.',
          clinicalExplanation: 'Accelerates hepatic steatosis (fatty liver deposition) and insulin resistance.',
          recommendedSwap: 'Replace with fresh water infused with mint/cucumber or whole raw fruits.'
        });
      } else if (fat > 25 && (nameLower.includes('fried') || nameLower.includes('butter'))) {
        warnings.push({
          condition: 'fatty_liver',
          conditionName: meta.name,
          conditionEmoji: meta.emoji,
          severity: 'warning_orange',
          severityLabel: 'Saturated Lipid Burden',
          title: 'Elevates Hepatic Triglyceride Load',
          reason: 'Heavy saturated fats stress liver cellular lipid clearance.',
          clinicalExplanation: 'Contributes to liver enzyme elevation (ALT/AST).',
          recommendedSwap: 'Cook with minimal cold-pressed olive or mustard oil; increase cruciferous greens.'
        });
      }
    }
  }

  // Calculate highest severity
  let highestSeverity: HealthSeverity = 'safe_green';
  if (warnings.some(w => w.severity === 'severe_red')) {
    highestSeverity = 'severe_red';
  } else if (warnings.some(w => w.severity === 'warning_orange')) {
    highestSeverity = 'warning_orange';
  } else if (warnings.some(w => w.severity === 'caution_yellow')) {
    highestSeverity = 'caution_yellow';
  }

  return {
    highestSeverity,
    warnings,
    hasWarnings: warnings.length > 0
  };
}
