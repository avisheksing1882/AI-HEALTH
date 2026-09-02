import { UserProfile, WorkoutType, HealthCondition, FitnessGoal } from '../types';
import { getStoredGeminiApiKey } from './geminiVision';
import { calculateWorkoutCalories } from './nutritionCalculator';

export interface ExerciseComponent {
  name: string;
  durationMinutes: number;
  caloriesBurned: number;
  metValue: number;
  notes?: string;
}

export interface AIWorkoutEstimate {
  title: string;
  workoutType: WorkoutType;
  totalDurationMinutes: number;
  totalCaloriesBurned: number;
  intensity: 'light' | 'moderate' | 'vigorous' | 'extreme';
  breakdown: ExerciseComponent[];
  clinicalInsights: string;
  suggestedHydrationBoostMl: number;
  source: 'gemini_ai' | 'clinical_met_engine';
}

export interface PlannedExercise {
  name: string;
  setsAndRepsOrDuration: string;
  targetMuscles: string;
  clinicalTip?: string;
}

export interface PlannedWorkoutDay {
  dayNumber: number;
  dayName: string;
  focus: string;
  targetDurationMinutes: number;
  estimatedBurnKcal: number;
  type: WorkoutType;
  exercises: PlannedExercise[];
  conditionSafeNote?: string;
}

export interface WeeklyWorkoutPlan {
  daysPerWeek: number;
  splitName: string;
  overview: string;
  weeklyTargetMinutes: number;
  weeklyTargetCalories: number;
  days: PlannedWorkoutDay[];
}

// ==========================================
// 🏋️ CLINICAL WEEKLY WORKOUT PLAN GENERATOR
// ==========================================

export function generateWeeklyWorkoutPlan(
  daysPerWeek: number,
  profile: UserProfile
): WeeklyWorkoutPlan {
  const safeDays = Math.max(1, Math.min(7, daysPerWeek));
  const conditions = profile.healthConditions || [];
  const goal = profile.fitnessGoal;
  const weight = profile.weightKg;

  const hasKneePain = conditions.includes('knee_pain');
  const hasBackPain = conditions.includes('back_pain');
  const hasPcos = conditions.includes('pcos_pcod');
  const hasThyroid = conditions.includes('thyroid');

  // Helper for knee/back safe exercise substitutions
  const getLegExercise = (standard: string, kneeSafe: string) => hasKneePain ? kneeSafe : standard;
  const getSpineExercise = (standard: string, backSafe: string) => hasBackPain ? backSafe : standard;

  let splitName = '';
  let overview = '';
  const days: PlannedWorkoutDay[] = [];

  switch (safeDays) {
    case 1:
      splitName = '1-Day Full Body Functional Conditioning';
      overview = 'A high-efficiency total-body routine activating all major muscle groups and cardiovascular endurance in one dedicated session.';
      days.push({
        dayNumber: 1,
        dayName: 'Day 1 — Total Body Functional Reset',
        focus: 'Chest, Back, Core, Legs & Aerobic Flush',
        targetDurationMinutes: 60,
        estimatedBurnKcal: Math.round(calculateWorkoutCalories('gym_strength', 60, weight, 'moderate')),
        type: 'gym_strength',
        conditionSafeNote: hasKneePain ? 'Low-impact knee friendly knee-angle cues applied.' : undefined,
        exercises: [
          { name: getLegExercise('Goblet Squats', 'Glute Bridges / Leg Press (Neutral angle)'), setsAndRepsOrDuration: '3 sets × 12 reps', targetMuscles: 'Quadriceps, Glutes', clinicalTip: 'Keep chest upright, push through midfoot' },
          { name: 'Dumbbell Flat Bench Press', setsAndRepsOrDuration: '3 sets × 10 reps', targetMuscles: 'Chest, Front Deltoids, Triceps' },
          { name: getSpineExercise('Bent-Over Barbell Rows', 'Chest-Supported Dumbbell Rows'), setsAndRepsOrDuration: '3 sets × 12 reps', targetMuscles: 'Lats, Upper Back, Biceps', clinicalTip: 'Squeeze shoulder blades without rounding spine' },
          { name: getSpineExercise('Overhead Dumbbell Press', 'Seated Neutral-Grip Dumbbell Press'), setsAndRepsOrDuration: '3 sets × 10 reps', targetMuscles: 'Deltoids, Upper Chest' },
          { name: 'Plank or McGill Bird-Dog', setsAndRepsOrDuration: '3 sets × 45 seconds', targetMuscles: 'Deep Core, Transverse Abdominis' },
          { name: 'Zone 2 Incline Walking or Cycling', setsAndRepsOrDuration: '15 minutes', targetMuscles: 'Cardiovascular System', clinicalTip: 'Steady aerobic pace (able to hold a conversation)' }
        ]
      });
      break;

    case 2:
      splitName = '2-Day Full Body Balance & Aerobic Split';
      overview = 'Two distributed full-body stimulus sessions designed to maintain lean muscle mass and metabolic health with ample recovery.';
      days.push(
        {
          dayNumber: 1,
          dayName: 'Day 1 — Full Body Strength A (Push & Squat)',
          focus: 'Chest, Quadriceps, Shoulders & Core',
          targetDurationMinutes: 50,
          estimatedBurnKcal: Math.round(calculateWorkoutCalories('gym_strength', 50, weight, 'moderate')),
          type: 'gym_strength',
          exercises: [
            { name: getLegExercise('Dumbbell Goblet Squat', 'Swiss Ball Wall Squats / Glute Bridges'), setsAndRepsOrDuration: '3 sets × 10-12 reps', targetMuscles: 'Quads, Glutes' },
            { name: 'Dumbbell Bench Press', setsAndRepsOrDuration: '3 sets × 10 reps', targetMuscles: 'Chest, Triceps' },
            { name: getSpineExercise('Overhead Dumbbell Press', 'Seated Dumbbell Shoulder Press'), setsAndRepsOrDuration: '3 sets × 12 reps', targetMuscles: 'Shoulders' },
            { name: 'Lat Pulldowns', setsAndRepsOrDuration: '3 sets × 12 reps', targetMuscles: 'Upper Back & Lats' },
            { name: 'Dead Bug Core Holds', setsAndRepsOrDuration: '3 sets × 10 reps/side', targetMuscles: 'Anterior Core' }
          ]
        },
        {
          dayNumber: 2,
          dayName: 'Day 2 — Full Body Strength B (Pull & Hinge + Cardio)',
          focus: 'Back, Hamstrings, Glutes & Zone 2 Cardio',
          targetDurationMinutes: 50,
          estimatedBurnKcal: Math.round(calculateWorkoutCalories('gym_strength', 50, weight, 'moderate')),
          type: 'gym_strength',
          exercises: [
            { name: getSpineExercise('Romanian Deadlift (Dumbbells)', 'Single-Leg Hip Thrusts / Hamstring Curls'), setsAndRepsOrDuration: '3 sets × 10 reps', targetMuscles: 'Hamstrings, Glutes' },
            { name: 'Chest-Supported Row', setsAndRepsOrDuration: '3 sets × 12 reps', targetMuscles: 'Mid Back & Rhomboids' },
            { name: 'Push-Ups or Incline Push-Ups', setsAndRepsOrDuration: '3 sets × 12-15 reps', targetMuscles: 'Chest, Core' },
            { name: 'Bicep Curls & Tricep Extensions', setsAndRepsOrDuration: '2 supersets × 12 reps', targetMuscles: 'Arms' },
            { name: 'Brisk Incline Walk / Cycling', setsAndRepsOrDuration: '15 minutes', targetMuscles: 'Cardiovascular Conditioning' }
          ]
        }
      );
      break;

    case 3:
      splitName = '3-Day Classic Push / Pull / Legs Split';
      overview = 'The gold-standard 3-day split allowing complete muscle recovery between dedicated push, pull, and leg training days.';
      days.push(
        {
          dayNumber: 1,
          dayName: 'Day 1 — Push (Chest, Shoulders & Triceps)',
          focus: 'Upper Body Pushing Mechanics',
          targetDurationMinutes: 45,
          estimatedBurnKcal: Math.round(calculateWorkoutCalories('gym_strength', 45, weight, 'moderate')),
          type: 'gym_strength',
          exercises: [
            { name: 'Dumbbell Flat / Incline Bench Press', setsAndRepsOrDuration: '4 sets × 8-10 reps', targetMuscles: 'Pectoralis Major, Anterior Deltoid' },
            { name: getSpineExercise('Standing Overhead Press', 'Seated Dumbbell Shoulder Press'), setsAndRepsOrDuration: '3 sets × 10-12 reps', targetMuscles: 'Anterior & Lateral Deltoids' },
            { name: 'Cable or Dumbbell Lateral Raises', setsAndRepsOrDuration: '3 sets × 15 reps', targetMuscles: 'Lateral Deltoids' },
            { name: 'Tricep Rope Pushdowns', setsAndRepsOrDuration: '3 sets × 12-15 reps', targetMuscles: 'Triceps Brachii' }
          ]
        },
        {
          dayNumber: 2,
          dayName: 'Day 2 — Pull (Back, Rear Delts & Biceps)',
          focus: 'Upper Body Pulling Mechanics & Posture',
          targetDurationMinutes: 45,
          estimatedBurnKcal: Math.round(calculateWorkoutCalories('gym_strength', 45, weight, 'moderate')),
          type: 'gym_strength',
          exercises: [
            { name: 'Lat Pulldowns or Pull-Ups', setsAndRepsOrDuration: '4 sets × 10 reps', targetMuscles: 'Latissimus Dorsi' },
            { name: getSpineExercise('Seated Cable Row', 'Chest-Supported Neutral Row'), setsAndRepsOrDuration: '3 sets × 12 reps', targetMuscles: 'Rhomboids, Mid Trapezius' },
            { name: 'Face Pulls', setsAndRepsOrDuration: '3 sets × 15 reps', targetMuscles: 'Rear Deltoids, Rotator Cuff', clinicalTip: 'Improves upper body posture and shoulder health' },
            { name: 'Dumbbell Hammer Curls', setsAndRepsOrDuration: '3 sets × 12 reps', targetMuscles: 'Biceps, Brachialis' }
          ]
        },
        {
          dayNumber: 3,
          dayName: 'Day 3 — Legs, Glutes & Core Stability',
          focus: 'Lower Body Strength & Deep Core',
          targetDurationMinutes: 45,
          estimatedBurnKcal: Math.round(calculateWorkoutCalories('gym_strength', 45, weight, 'moderate')),
          type: 'gym_strength',
          exercises: [
            { name: getLegExercise('Goblet Squats or Leg Press', 'Seated Leg Press (Feet shoulder width)'), setsAndRepsOrDuration: '4 sets × 10-12 reps', targetMuscles: 'Quadriceps, Glutes' },
            { name: getSpineExercise('Romanian Deadlifts', 'Swiss Ball Hamstring Curls'), setsAndRepsOrDuration: '3 sets × 10 reps', targetMuscles: 'Hamstrings, Posterior Chain' },
            { name: getLegExercise('Walking Lunges', 'Step-Ups on Low Bench'), setsAndRepsOrDuration: '3 sets × 10 reps/leg', targetMuscles: 'Glutes, Stabilizers' },
            { name: 'Plank with Shoulder Taps', setsAndRepsOrDuration: '3 sets × 45 seconds', targetMuscles: 'Transverse Abdominis, Core' }
          ]
        }
      );
      break;

    case 4:
      splitName = '4-Day Upper / Lower Periodized Split';
      overview = 'Scientifically proven optimal frequency: stimulates every muscle group twice per week with optimal recovery balance.';
      days.push(
        {
          dayNumber: 1,
          dayName: 'Day 1 — Upper Body Strength & Power',
          focus: 'Heavy Horizontal Push & Pull',
          targetDurationMinutes: 45,
          estimatedBurnKcal: Math.round(calculateWorkoutCalories('gym_strength', 45, weight, 'moderate')),
          type: 'gym_strength',
          exercises: [
            { name: 'Flat Barbell / Dumbbell Bench Press', setsAndRepsOrDuration: '4 sets × 8 reps', targetMuscles: 'Chest, Triceps' },
            { name: getSpineExercise('Barbell Row', 'Chest-Supported Row'), setsAndRepsOrDuration: '4 sets × 8 reps', targetMuscles: 'Lats, Rhomboids' },
            { name: 'Overhead Shoulder Press', setsAndRepsOrDuration: '3 sets × 10 reps', targetMuscles: 'Shoulders' },
            { name: 'Face Pulls with External Rotation', setsAndRepsOrDuration: '3 sets × 15 reps', targetMuscles: 'Rotator Cuff' }
          ]
        },
        {
          dayNumber: 2,
          dayName: 'Day 2 — Lower Body Strength & Core',
          focus: 'Quadriceps, Glutes & Spinal Stability',
          targetDurationMinutes: 45,
          estimatedBurnKcal: Math.round(calculateWorkoutCalories('gym_strength', 45, weight, 'moderate')),
          type: 'gym_strength',
          exercises: [
            { name: getLegExercise('Barbell Back / Goblet Squat', 'Leg Press (Moderate depth)'), setsAndRepsOrDuration: '4 sets × 8-10 reps', targetMuscles: 'Quads, Adductors' },
            { name: getSpineExercise('Romanian Deadlifts', 'Glute Hamstring Bridges'), setsAndRepsOrDuration: '3 sets × 10 reps', targetMuscles: 'Hamstrings' },
            { name: 'Calf Raises', setsAndRepsOrDuration: '3 sets × 15 reps', targetMuscles: 'Gastrocnemius, Soleus' },
            { name: 'Hanging Knee Raises or Planks', setsAndRepsOrDuration: '3 sets × 12 reps', targetMuscles: 'Lower Abs' }
          ]
        },
        {
          dayNumber: 3,
          dayName: 'Day 3 — Upper Body Hypertrophy & Arms',
          focus: 'Incline Pushing, Vertical Pulling & Delts',
          targetDurationMinutes: 45,
          estimatedBurnKcal: Math.round(calculateWorkoutCalories('gym_strength', 45, weight, 'moderate')),
          type: 'gym_strength',
          exercises: [
            { name: 'Incline Dumbbell Press', setsAndRepsOrDuration: '3 sets × 10-12 reps', targetMuscles: 'Upper Pectorals' },
            { name: 'Lat Pulldowns (Wide or Neutral Grip)', setsAndRepsOrDuration: '3 sets × 10-12 reps', targetMuscles: 'Lats' },
            { name: 'Dumbbell Lateral Raises', setsAndRepsOrDuration: '4 sets × 15 reps', targetMuscles: 'Side Delts' },
            { name: 'Bicep Curls & Overhead Tricep Extensions', setsAndRepsOrDuration: '3 supersets × 12 reps', targetMuscles: 'Arms' }
          ]
        },
        {
          dayNumber: 4,
          dayName: 'Day 4 — Lower Body Hypertrophy & Cardio Flush',
          focus: 'Posterior Chain, Unilateral Legs & Aerobic Finish',
          targetDurationMinutes: 50,
          estimatedBurnKcal: Math.round(calculateWorkoutCalories('gym_strength', 50, weight, 'moderate')),
          type: 'gym_strength',
          exercises: [
            { name: getLegExercise('Bulgarian Split Squats / Lunges', 'Step-ups on Low Step'), setsAndRepsOrDuration: '3 sets × 10 reps/leg', targetMuscles: 'Glute Medius, Quads' },
            { name: 'Leg Curls (Seated or Lying)', setsAndRepsOrDuration: '3 sets × 12 reps', targetMuscles: 'Hamstrings' },
            { name: 'Side Planks & Pallof Press', setsAndRepsOrDuration: '3 sets × 30s/side', targetMuscles: 'Obliques, Deep Spine' },
            { name: 'Incline Treadmill Walk or Stationary Bike', setsAndRepsOrDuration: '15 minutes', targetMuscles: 'Cardiovascular Recovery' }
          ]
        }
      );
      break;

    case 5:
      splitName = '5-Day Push / Pull / Legs / Upper / Lower Split';
      overview = 'High-frequency athletic routine offering optimal volume distribution across 5 focused daily training sessions.';
      days.push(
        {
          dayNumber: 1,
          dayName: 'Day 1 — Push A (Chest & Triceps Focus)',
          focus: 'Horizontal & Vertical Pushing',
          targetDurationMinutes: 45,
          estimatedBurnKcal: Math.round(calculateWorkoutCalories('gym_strength', 45, weight, 'moderate')),
          type: 'gym_strength',
          exercises: [
            { name: 'Flat Dumbbell Press', setsAndRepsOrDuration: '4 sets × 8-10 reps', targetMuscles: 'Chest' },
            { name: 'Incline Dumbbell Flyes', setsAndRepsOrDuration: '3 sets × 12 reps', targetMuscles: 'Upper Chest' },
            { name: 'Overhead Tricep Extension', setsAndRepsOrDuration: '3 sets × 12 reps', targetMuscles: 'Triceps' },
            { name: 'Cable Lateral Raises', setsAndRepsOrDuration: '3 sets × 15 reps', targetMuscles: 'Shoulders' }
          ]
        },
        {
          dayNumber: 2,
          dayName: 'Day 2 — Pull A (Lats & Biceps Focus)',
          focus: 'Vertical & Horizontal Pulling',
          targetDurationMinutes: 45,
          estimatedBurnKcal: Math.round(calculateWorkoutCalories('gym_strength', 45, weight, 'moderate')),
          type: 'gym_strength',
          exercises: [
            { name: 'Lat Pulldowns (Neutral Grip)', setsAndRepsOrDuration: '4 sets × 10 reps', targetMuscles: 'Lats' },
            { name: getSpineExercise('Barbell Row', 'Chest-Supported Row'), setsAndRepsOrDuration: '3 sets × 10 reps', targetMuscles: 'Upper Back' },
            { name: 'Incline Dumbbell Bicep Curls', setsAndRepsOrDuration: '3 sets × 12 reps', targetMuscles: 'Biceps' },
            { name: 'Face Pulls', setsAndRepsOrDuration: '3 sets × 15 reps', targetMuscles: 'Rear Delts' }
          ]
        },
        {
          dayNumber: 3,
          dayName: 'Day 3 — Legs & Calves',
          focus: 'Quadriceps, Glutes & Calves',
          targetDurationMinutes: 45,
          estimatedBurnKcal: Math.round(calculateWorkoutCalories('gym_strength', 45, weight, 'moderate')),
          type: 'gym_strength',
          exercises: [
            { name: getLegExercise('Goblet Squat or Leg Press', 'Seated Leg Press'), setsAndRepsOrDuration: '4 sets × 10 reps', targetMuscles: 'Quads' },
            { name: getSpineExercise('Romanian Deadlift', 'Hamstring Curls'), setsAndRepsOrDuration: '3 sets × 10 reps', targetMuscles: 'Hamstrings' },
            { name: 'Standing Calf Raises', setsAndRepsOrDuration: '4 sets × 15 reps', targetMuscles: 'Calves' },
            { name: 'Hanging Knee Raises', setsAndRepsOrDuration: '3 sets × 12 reps', targetMuscles: 'Core' }
          ]
        },
        {
          dayNumber: 4,
          dayName: 'Day 4 — Upper Body Hypertrophy',
          focus: 'Shoulders, Arms & Upper Back',
          targetDurationMinutes: 45,
          estimatedBurnKcal: Math.round(calculateWorkoutCalories('gym_strength', 45, weight, 'moderate')),
          type: 'gym_strength',
          exercises: [
            { name: 'Seated Dumbbell Shoulder Press', setsAndRepsOrDuration: '3 sets × 10 reps', targetMuscles: 'Deltoids' },
            { name: 'Cable Rows', setsAndRepsOrDuration: '3 sets × 12 reps', targetMuscles: 'Mid Back' },
            { name: 'Push-ups to Failure', setsAndRepsOrDuration: '3 sets', targetMuscles: 'Chest, Triceps' },
            { name: 'Hammer Curls & Skull Crushers', setsAndRepsOrDuration: '3 supersets × 12 reps', targetMuscles: 'Arms' }
          ]
        },
        {
          dayNumber: 5,
          dayName: 'Day 5 — Lower Body & Conditioning',
          focus: 'Posterior Chain, Core & Aerobic Capacity',
          targetDurationMinutes: 50,
          estimatedBurnKcal: Math.round(calculateWorkoutCalories('gym_strength', 50, weight, 'moderate')),
          type: 'gym_strength',
          exercises: [
            { name: getLegExercise('Dumbbell Lunges', 'Step-ups'), setsAndRepsOrDuration: '3 sets × 10 reps/leg', targetMuscles: 'Glutes, Quads' },
            { name: 'Glute Bridges / Hip Thrusts', setsAndRepsOrDuration: '3 sets × 12 reps', targetMuscles: 'Glutes' },
            { name: 'Plank & Side Plank Holds', setsAndRepsOrDuration: '3 sets × 45s', targetMuscles: 'Core' },
            { name: 'Moderate Cardio (Incline walk, Row, or Bike)', setsAndRepsOrDuration: '20 minutes', targetMuscles: 'Cardio' }
          ]
        }
      );
      break;

    case 6:
    case 7:
      splitName = `${safeDays}-Day High Performance Athletic Split`;
      overview = 'Periodized high-volume training with dedicated active recovery to optimize body recomposition and athletic conditioning.';
      const sampleSplits = ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B', 'Active Recovery & Mobility'];
      for (let i = 1; i <= safeDays; i++) {
        const isRecovery = i === 7;
        days.push({
          dayNumber: i,
          dayName: `Day ${i} — ${sampleSplits[i - 1]}`,
          focus: isRecovery ? 'Full Body Mobility, Joint Recovery & Light Walk' : 'Targeted Muscle Group Hypertrophy',
          targetDurationMinutes: isRecovery ? 30 : 45,
          estimatedBurnKcal: Math.round(calculateWorkoutCalories(isRecovery ? 'yoga' : 'gym_strength', isRecovery ? 30 : 45, weight, isRecovery ? 'light' : 'moderate')),
          type: isRecovery ? 'yoga' : 'gym_strength',
          exercises: isRecovery ? [
            { name: 'Dynamic Foam Rolling & Hip Openers', setsAndRepsOrDuration: '10 minutes', targetMuscles: 'Fascia & Hips' },
            { name: 'Cat-Cow, Bird-Dog & World\'s Greatest Stretch', setsAndRepsOrDuration: '10 minutes', targetMuscles: 'Thoracic & Spine' },
            { name: 'Gentle Outdoor Walk', setsAndRepsOrDuration: '15 minutes', targetMuscles: 'Cardiovascular Lymphatic Drainage' }
          ] : [
            { name: 'Compound Primary Lift', setsAndRepsOrDuration: '4 sets × 8-10 reps', targetMuscles: 'Primary Muscle Group' },
            { name: 'Accessory Movement A', setsAndRepsOrDuration: '3 sets × 10-12 reps', targetMuscles: 'Secondary Muscle Group' },
            { name: 'Isolation Movement B', setsAndRepsOrDuration: '3 sets × 12-15 reps', targetMuscles: 'Synergist Muscles' },
            { name: 'Core Stability or HIIT Finisher', setsAndRepsOrDuration: '10 minutes', targetMuscles: 'Metabolic Condition' }
          ]
        });
      }
      break;
  }

  const weeklyTargetMinutes = days.reduce((sum, d) => sum + d.targetDurationMinutes, 0);
  const weeklyTargetCalories = days.reduce((sum, d) => sum + d.estimatedBurnKcal, 0);

  return {
    daysPerWeek: safeDays,
    splitName,
    overview,
    weeklyTargetMinutes,
    weeklyTargetCalories,
    days
  };
}

// ==========================================
// 🤖 AI NATURAL LANGUAGE WORKOUT ESTIMATOR
// ==========================================

export async function estimateWorkoutFromNaturalLanguage(
  summaryText: string,
  profile: UserProfile
): Promise<AIWorkoutEstimate> {
  const cleanSummary = summaryText.trim();
  if (!cleanSummary) {
    throw new Error('Please enter a description of your workout');
  }

  const apiKey = getStoredGeminiApiKey();

  if (apiKey) {
    try {
      return await callGeminiWorkoutEstimator(cleanSummary, profile, apiKey);
    } catch (err) {
      console.warn('[AI Workout Estimator] Gemini API unavailable, using clinical MET fallback engine:', err);
    }
  }

  // Fallback to Clinical MET Engine
  return estimateWorkoutWithClinicalMETEngine(cleanSummary, profile);
}

async function callGeminiWorkoutEstimator(
  summaryText: string,
  profile: UserProfile,
  apiKey: string
): Promise<AIWorkoutEstimate> {
  const prompt = `
You are a Certified Clinical Exercise Physiologist (ACSM & NSCA certified).
Analyze the following natural language workout description and calculate exact energy expenditure based on the user's physiological parameters.

User Physiological Parameters:
- Body Weight: ${profile.weightKg} kg
- Gender: ${profile.gender}
- Age: ${profile.age} years
- Fitness Goal: ${profile.fitnessGoal}
- Health Conditions: ${profile.healthConditions?.join(', ') || 'None'}

User Workout Summary:
"${summaryText}"

CRITICAL CALCULATION FORMULA:
Calories Burned = MET × Weight (kg) × (Duration in Minutes / 60)
Common MET reference values:
- Brisk Walking: 3.5 - 4.5 MET
- Running / Jogging (8-10 km/h): 8.5 - 10.0 MET
- Cycling (moderate): 7.0 - 8.5 MET
- Weightlifting / Gym Strength Training: 5.0 - 6.5 MET
- HIIT / Circuit: 9.0 - 11.0 MET
- Yoga / Stretching: 2.5 - 3.5 MET
- Swimming: 7.0 - 9.0 MET
- Badminton / Sports: 6.5 - 8.0 MET

Respond ONLY with a valid JSON object matching this schema (no markdown fences, no text outside JSON):
{
  "title": "Concise Descriptive Workout Title (e.g. 5km Treadmill Run & Strength Circuit)",
  "workoutType": "running" | "cycling" | "gym_strength" | "yoga" | "hiit" | "swimming" | "walking" | "pilates" | "sports" | "other",
  "totalDurationMinutes": 45,
  "totalCaloriesBurned": 340,
  "intensity": "light" | "moderate" | "vigorous" | "extreme",
  "breakdown": [
    {
      "name": "Specific Exercise Component (e.g. Treadmill Jogging)",
      "durationMinutes": 25,
      "caloriesBurned": 220,
      "metValue": 8.5,
      "notes": "Zone 3 aerobic conditioning"
    }
  ],
  "clinicalInsights": "Physiological explanation of energy expenditure and recovery recommendations",
  "suggestedHydrationBoostMl": 350
}
`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1000,
      responseMimeType: 'application/json'
    }
  };

  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-flash-latest'
  ];

  let lastError = '';
  for (const model of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        lastError = await response.text();
        continue;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = JSON.parse(rawText);
      return {
        title: parsed.title || 'AI Analyzed Workout',
        workoutType: (parsed.workoutType || 'gym_strength') as WorkoutType,
        totalDurationMinutes: Math.max(5, Math.round(Number(parsed.totalDurationMinutes) || 30)),
        totalCaloriesBurned: Math.max(20, Math.round(Number(parsed.totalCaloriesBurned) || 200)),
        intensity: parsed.intensity || 'moderate',
        breakdown: Array.isArray(parsed.breakdown) ? parsed.breakdown.map((b: any) => ({
          name: b.name || 'Exercise',
          durationMinutes: Math.round(Number(b.durationMinutes) || 15),
          caloriesBurned: Math.round(Number(b.caloriesBurned) || 100),
          metValue: Number(b.metValue) || 6.0,
          notes: b.notes || ''
        })) : [],
        clinicalInsights: parsed.clinicalInsights || `Clinically estimated for your ${profile.weightKg}kg body weight.`,
        suggestedHydrationBoostMl: Math.round(Number(parsed.suggestedHydrationBoostMl) || 350),
        source: 'gemini_ai'
      };
    } catch (err: any) {
      lastError = err?.message || 'Gemini call failed';
    }
  }

  throw new Error(lastError || 'Failed to call Gemini AI');
}

/**
 * Robust Offline Clinical MET Fallback Engine
 * Parses natural language with regex and clinical MET coefficients.
 */
export function estimateWorkoutWithClinicalMETEngine(
  text: string,
  profile: UserProfile
): AIWorkoutEstimate {
  const lower = text.toLowerCase();
  const weight = profile.weightKg;

  // Extract total duration if mentioned (e.g. "45 min", "30 minutes", "1 hour", "1.5 hours")
  let totalMinutes = 30; // default baseline
  const minMatch = lower.match(/(\d+)\s*(?:mins?|minutes?)/);
  const hrMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/);

  if (hrMatch) {
    totalMinutes = Math.round(parseFloat(hrMatch[1]) * 60);
  } else if (minMatch) {
    totalMinutes = parseInt(minMatch[1], 10);
  }

  // Detect exercises and METs
  interface MetRule {
    keywords: string[];
    type: WorkoutType;
    label: string;
    met: number;
    intensity: 'light' | 'moderate' | 'vigorous' | 'extreme';
  }

  const metRules: MetRule[] = [
    { keywords: ['sprint', 'fast run', 'tempo run'], type: 'running', label: 'High-Intensity Sprinting / Running', met: 11.0, intensity: 'extreme' },
    { keywords: ['run', 'jog', 'treadmill', 'running'], type: 'running', label: 'Outdoor / Treadmill Running', met: 8.5, intensity: 'vigorous' },
    { keywords: ['cycle', 'cycling', 'bike', 'spin', 'spinning'], type: 'cycling', label: 'Cycling / Spinning', met: 7.5, intensity: 'moderate' },
    { keywords: ['hiit', 'burpee', 'circuit', 'tabata', 'crossfit'], type: 'hiit', label: 'HIIT / High-Intensity Circuit', met: 9.5, intensity: 'vigorous' },
    { keywords: ['swim', 'swimming', 'laps'], type: 'swimming', label: 'Lap Swimming', met: 7.5, intensity: 'vigorous' },
    { keywords: ['bench', 'squat', 'deadlift', 'dumbell', 'dumbbell', 'weight', 'gym', 'press', 'curl', 'lift', 'strength'], type: 'gym_strength', label: 'Resistance & Strength Training', met: 5.5, intensity: 'moderate' },
    { keywords: ['walk', 'walking', 'stroll', 'hike'], type: 'walking', label: 'Brisk Walking / Hiking', met: 3.8, intensity: 'light' },
    { keywords: ['yoga', 'stretch', 'stretching', 'vinyasa'], type: 'yoga', label: 'Yoga & Flow', met: 3.0, intensity: 'light' },
    { keywords: ['pilates', 'core', 'plank'], type: 'pilates', label: 'Pilates & Core Conditioning', met: 4.0, intensity: 'moderate' },
    { keywords: ['badminton', 'tennis', 'football', 'soccer', 'basketball', 'cricket'], type: 'sports', label: 'Competitive Sports', met: 7.0, intensity: 'vigorous' },
  ];

  const matchedRules: MetRule[] = [];
  for (const rule of metRules) {
    if (rule.keywords.some(k => lower.includes(k))) {
      matchedRules.push(rule);
    }
  }

  if (matchedRules.length === 0) {
    // Default general exercise
    matchedRules.push({
      keywords: [],
      type: 'gym_strength',
      label: 'General Physical Activity',
      met: 5.0,
      intensity: 'moderate'
    });
  }

  // Divide time among matched exercises
  const timePerExercise = Math.max(5, Math.round(totalMinutes / matchedRules.length));
  const breakdown: ExerciseComponent[] = [];
  let totalCalories = 0;

  matchedRules.forEach(rule => {
    // Calories = MET * weightKg * (duration / 60)
    const kcal = Math.round(rule.met * weight * (timePerExercise / 60));
    totalCalories += kcal;
    breakdown.push({
      name: rule.label,
      durationMinutes: timePerExercise,
      caloriesBurned: kcal,
      metValue: rule.met,
      notes: `${rule.intensity} intensity (${rule.met} MET)`
    });
  });

  const primaryRule = matchedRules[0];
  const suggestedHydrationBoostMl = Math.round((totalMinutes / 30) * 400);

  return {
    title: `${matchedRules.map(r => r.label.split(' ')[0]).join(' + ')} Workout`,
    workoutType: primaryRule.type,
    totalDurationMinutes: totalMinutes,
    totalCaloriesBurned: totalCalories,
    intensity: primaryRule.intensity,
    breakdown,
    clinicalInsights: `Estimated using ACSM metabolic equations for a ${weight}kg ${profile.gender}. Hydration sweat loss replenishment recommendation: +${suggestedHydrationBoostMl}ml.`,
    suggestedHydrationBoostMl,
    source: 'clinical_met_engine'
  };
}
